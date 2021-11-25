process.env.NTBA_FIX_350 = 1 // Disable telegram bot deprecation message
require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const logger = require('node-color-log')
const { firefox } = require('playwright')

const { initializeDb, getArticlesFromDb, updateCells, addRow, updateLastScrap, getLastScrap } = require('./db/utils.js')

const vendorsData = require('./vendorsData.json')
const { vendorsObj } = require('./vendorsObj')

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: process.env.LISTENBOT === '1' })
const chatId = 133337935

if (process.env.LISTENBOT === '1') {
  bot.on('polling_error', (error) => {
    console.error(error)
    bot.sendMessage(chatId, 'Err on polling')
  })
  bot.addListener('message', async (data) => {
    switch (data.text) {
      case '/vendors':
      {
        // const refreshedArticles = await getArticlesFromDb()
        // const vendorsMessage = Object.values(vendorsData).map(vendor => {
        //   let message = `<b>${vendor.name}</b>\n`
        //   message += vendor.items[chatId].map(item => `<a href="${item.url}">${item.article}</a> · ${refreshedArticles.find(article => article.key === (`${vendor.name}_${item.article}`).replaceAll(' ', '')).price}`).join('\n')
        //   return message
        // }).join('\n\n')
        // bot.sendMessage(chatId, vendorsMessage, { parse_mode: 'HTML', disable_web_page_preview: true })
        break
      }

      case '/alive':
        bot.sendMessage(chatId, `Yas! (${process.env.SERVER || 'NONE'})`)
        break

      case '/lastscrap':
        ;(async () => {
          try {
            const last = await getLastScrap()
            bot.sendMessage(chatId, `<b>PC</b> · ${last.pc}\n<b>Clouding</b> · ${last.clouding}`, { parse_mode: 'HTML' })
          } catch (err) {
            bot.sendMessage(chatId, 'Error on get last scrap')
          }
        })()
        break

      case '/add':
        break
      case '/remove':
        break
      case '/update':
        break
      case '/enable':
        break
      case '/disable':
        break
      case '/screenshot':
        break
    }
  })
}

const activeVendors = process.env.ACTIVEVENDORS.split(',')
console.log(`\n\n${activeVendors.join(' | ')}`)

let articles = null
let browser = null
  ; (async function scrap () {
  if (!browser) {
    browser = await firefox.launch({ headless: process.env.HEADLESS !== 1 })
  }
  if (!articles) {
    await initializeDb()
  }

  articles = await getArticlesFromDb()

  try {
    console.log(`\n\nSTART SCRAPPING... (${(new Date()).toLocaleTimeString()})`)

    const vendors = vendorsObj.filter(vendor => activeVendors.includes(vendor.key))

    for (const vendor of vendors) {
      console.log(`\n${vendor.name} (${vendor.jsEnabled ? 'JS enabled' : 'JS disabled'})`)

      const items = vendor.items[chatId].filter(item => item.active)
      if (items.length === 0) {
        console.log('\tNo active items')
      } else {
        for (const item of items) {
          const context = await browser.newContext({
            javaScriptEnabled: vendor.jsEnabled
          })
          context.setDefaultTimeout(10000)

          const page = await context.newPage()

          const key = (`${vendor.name}_${item.article}`).replaceAll(' ', '')

          let price = null
          let image = null

          try {
            await page.goto(item.url, { waitUntil: 'load' })
            price = (await vendor.checkPrice({ context, page }))
            console.log(`\t${item.article} · ${price}`)
          } catch (err) {
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · Err (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(`\t${item.article} · (${err.message.split('=')[0].trim()})\t`)
          }

          try {
            image = await page.screenshot({ path: `screenshots/${key}_full.png`, fullPage: true })
            image = await page.screenshot({ path: `screenshots/${key}.png` })
          } catch (err) {
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · Err on screenshot (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(`Err on screenshot (${err.message.split('=')[0].trim()})`)
          }

          const article = articles.find(article => article.key === key)
          if (price && (!article || article.price !== price)) {
            logger.color('black').bgColor('green').log(` UPDATED!! (prev ${article?.price || 'NONE'
                }) 👀 `)

            const message = `<b>${vendor.name} - ${item.article}</b>\n${article?.price || 'NONE'
                } => ${price}\n<a href='${item.url}'>LINK</a>`
            bot
              .sendPhoto(chatId, image, { parse_mode: 'HTML', caption: message })
              .then(() => 'Telegram mensage sent')

            if (article) {
              article.price = price
              article.date = (new Date()).getTime()
              await updateCells(article)
            } else {
              const obj = {
                date: (new Date()).getTime(),
                key,
                vendor: vendor.name,
                article: item.article,
                price
              }

              const cells = await addRow(obj)
              articles.push({ ...obj, cells })
            }
          }

          await page.close()
          await context.close()
        }
      }
    }

    // await updateDb(articles)

    // await browser.close()

    await updateLastScrap()

    console.log(`\n\nSCRAP FINISHED (${(new Date()).toLocaleTimeString()})`)
  } catch (err) {
    logger.color('black').bgColor('red').log(err.message.split('=')[0].trim())
    bot.sendMessage(chatId, `Err on browser (${err.message.split('=')[0].trim()})`)
  }

  setTimeout(() => {
    // Scrap after 30s after finishing
    scrap()
  }, 30 * 1000)
})()

setInterval(() => {
  bot.sendMessage(chatId, `Still alive! 🤘🏼 (${process.env.SERVER || 'NONE'})`)
}, 2 * 60 * 60 * 1000) // 2 hours
