require('dotenv').config()
const { CHATID, ACTIVEVENDORS, HEADLESS, SERVERID } = process.env

const md5 = require('md5-nodejs')

const logger = require('node-color-log')
const { firefox } = require('playwright')
const { vendorsObj } = require('./vendors/vendorsObj')
const { initializeDb, getArticlesFromDb, updateCells, addRow, updateLastScrap } = require('./db/utils.js')
const { bot } = require('./telegram/bot')

const activeVendors = ACTIVEVENDORS.split(',')
logger.dim().log(`\n\n${activeVendors.join(' | ')}`)
logger.log('\n\n- - - - -')

let articles = null
let browser = null
  ; (async function scrap () {
  try {
    const startDate = new Date()
    console.log(`\n🔎 START SCRAPPING... (${startDate.toLocaleTimeString()})`)

    if (!browser || !browser.isConnected()) {
      browser = await firefox.launch({ headless: HEADLESS !== 1 })
      await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Browser launched`, { parse_mode: 'HTML' })
      logger.dim().log('Browser launched')

      browser.on('disconnected', async () => {
        logger.bgColor('red').color('black').log(' ⚠️  Browser disconected ')
        await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Browser disconected`, { parse_mode: 'HTML' })
      })
    }
    if (!articles) {
      await initializeDb(bot)
    }

    articles = await getArticlesFromDb(bot)

    const vendors = vendorsObj.filter(vendor => activeVendors.includes(vendor.key))

    for (const vendor of vendors) {
      logger.bold().log(`\n${vendor.name}`).joint().dim().log(` ${vendor.jsEnabled ? '(JS enabled)' : ''}`)

      const items = articles.filter(article =>
        article.vendor === vendor.key
      ).filter(item =>
        item.active === 'TRUE'
      )

      if (items.length === 0) {
        console.log('\tNo active items')
      } else {
        for (const item of items) {
          const context = await browser.newContext({
            javaScriptEnabled: vendor.jsEnabled
          })
          context.setDefaultTimeout(10000)

          const page = await context.newPage()

          const key = md5(`${vendor.key}${item.name}${item.url}`)
          const article = articles.find(article => article.key === key)

          let price = null
          let image = null

          try {
            await page.goto(item.url, { waitUntil: 'load' })
            price = (await vendor.checkPrice({ context, page }))
            console.log(`\t${item.name} · ${price}`)
          } catch (err) {
            await bot.sendMessage(CHATID, `${vendor.name} - ${item.name} · Err (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(`${item.name} · (${err.message.split('=')[0].trim()}) `)
          }

          try {
            await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}_full.png`, fullPage: true })
            image = await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}.png` })
          } catch (err) {
            await bot.sendMessage(CHATID, `${vendor.name} - ${item.name} · Err on screenshot (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(` Err on screenshot (${err.message.split('=')[0].trim()}) `)
          }

          if (price && (!article || article.price !== price)) {
            logger.color('black').bgColor('green').log(` UPDATED!! (prev ${article?.price || 'NONE'
                 }) 👀 `)

            const message = `<b>${vendor.name} - ${item.name}</b>\n${article?.price || 'NONE'
                 } => ${price}\n<a href='${item.url}'>LINK</a>`
            await bot
              .sendPhoto(CHATID, image, { parse_mode: 'HTML', caption: message })

            const date = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
            if (article) {
              article.price = price
              article.date = date
              await updateCells(bot, article)
            } else {
              const obj = {
                date,
                key,
                vendor: vendor.name,
                name: item.name,
                price,
                active: article.active,
                url: article.url
              }

              const cells = await addRow(bot, obj)
              articles.push({ ...obj, cells })
            }
          }

          await page.close()
          await context.close()
        }
      }
    }

    await updateLastScrap(bot)

    console.log(`\n\n🏁 SCRAP FINISHED (${(new Date()).toLocaleTimeString()}) - ${(new Date((new Date()).getTime() - startDate.getTime())).getSeconds()}s\n\n- - - - - - -`)
  } catch (err) {
    logger.color('black').bgColor('red').log(` ${err.message.split('=')[0].trim()} `)
    await bot.sendMessage(CHATID, `Err on browser (${err.message.split('=')[0].trim()})`)
  }

  setTimeout(() => {
    // Scrap after 30s after finishing
    scrap()
  }, 30 * 1000)
})()
