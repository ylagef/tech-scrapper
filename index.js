const md5 = require('md5-nodejs')

process.env.NTBA_FIX_350 = 1 // Disable telegram bot deprecation message
require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const logger = require('node-color-log')

const { firefox } = require('playwright')

const { initializeDb, getArticlesFromDb, updateCells, addRow, updateLastScrap, getLastScrap } = require('./db/utils.js')

const { vendorsObj } = require('./vendorsObj')

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: process.env.LISTENBOT === '1' })
const chatId = 133337935

if (process.env.LISTENBOT === '1') {
  bot.on('polling_error', async (error) => {
    logger.bgColor('red').color('black').log(error)
    await bot.sendMessage(chatId, `Err on polling ${error.message}`)
  })

  bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data
    // const msg = callbackQuery.message
    if (action.startsWith('new_')) {
      try {
        const newItem = { active: true }

        const vendor = action.split('_')[1]
        const nameMessage = await bot.sendMessage(chatId, 'Article name?', { reply_markup: { force_reply: true, input_field_placeholder: 'Name of the article' } })
        console.log(`MESSAGE ID ${nameMessage.message_id}`)

        bot.onReplyToMessage(chatId, nameMessage.message_id, async (msg) => {
          const name = msg.text
          newItem.name = name

          const urlMessage = await bot.sendMessage(chatId, `${name}'s url?`, { reply_markup: { force_reply: true, input_field_placeholder: 'Url of the article' } })

          bot.onReplyToMessage(chatId, urlMessage.message_id, async (msg) => {
            const url = msg.text

            newItem.url = url
            newItem.vendor = vendor
            newItem.key = md5(`${vendor}${name}${url}`)
            newItem.date = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`

            await addRow(newItem)

            logger.bgColor('green').color('black').log(` ${name} was added! 💪🏼 `)
            await bot.sendMessage(chatId, `${name} was added!`)
          })
        })
      } catch (err) {
        logger.bgColor('red').color('black').log('Error on add new', err.message)
        await bot.sendMessage(chatId, 'Error on add new')
      }
    }
  })

  bot.onText(/\/lastscrap/, async () => {
    try {
      const last = await getLastScrap()
      await bot.sendMessage(chatId, `<b>PC</b> · ${last.pc}\n<b>Clouding</b> · ${last.clouding}`, { parse_mode: 'HTML' })
    } catch (err) {
      logger.bgColor('red').color('black').log('Error on get last scrap', err.message)
      await bot.sendMessage(chatId, 'Error on get last scrap')
    }
  })
  bot.onText(/\/new/, async (msg) => {
    try {
      const vendors = process.env.ALLVENDORS.split(',').sort().map(vendor =>
        ({
          text: vendorsObj.find(vendorObj =>
            vendorObj.key === vendor
          )?.name,
          callback_data: `new_${vendor}`
        })
      )

      const keyboard = []
      for (let i = 0; i < vendors.length; i++) {
        const index = Math.floor(i / 2)

        if (!keyboard[index]) keyboard[index] = []
        keyboard[index].push(vendors[i])
      }

      const opts = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }

      await bot.sendMessage(chatId, 'Select the vendor', opts)
    } catch (err) {
      logger.bgColor('red').color('black').log('Error on add new (select vendor)', err.message)
      await bot.sendMessage(chatId, 'Error on add new (select vendor)')
    }
  })
}

const activeVendors = process.env.ACTIVEVENDORS.split(',')
logger.dim().log(`\n\n${activeVendors.join(' | ')}`)
logger.log('\n\n- - - - -')

let articles = null
let browser = null
  ; (async function scrap () {
  const startDate = new Date()
  console.log(`\n🔎 START SCRAPPING... (${startDate.toLocaleTimeString()})`)

  if (!browser || !browser.isConnected()) {
    browser = await firefox.launch({ headless: process.env.HEADLESS !== 1 })
    await bot.sendMessage(chatId, `<b>(${process.env.SERVER || 'NONE'})</b> · Browser launched`, { parse_mode: 'HTML' })
    logger.dim().log('Browser launched')

    browser.on('disconnected', async () => {
      logger.bgColor('red').color('black').log(' ⚠️  Browser disconected ')
      await bot.sendMessage(chatId, `<b>(${process.env.SERVER || 'NONE'})</b> · Browser disconected`, { parse_mode: 'HTML' })
    })
  }
  if (!articles) {
    await initializeDb()
  }

  try {
    articles = await getArticlesFromDb()

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
            await bot.sendMessage(chatId, `${vendor.name} - ${item.name} · Err (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(`${item.name} · (${err.message.split('=')[0].trim()}) `)
          }

          try {
            await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}_full.png`, fullPage: true })
            image = await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}.png` })
          } catch (err) {
            await bot.sendMessage(chatId, `${vendor.name} - ${item.name} · Err on screenshot (${err.message.split('=')[0].trim()})`)
            logger.color('black').bgColor('red').log(` Err on screenshot (${err.message.split('=')[0].trim()}) `)
          }

          if (price && (!article || article.price !== price)) {
            logger.color('black').bgColor('green').log(` UPDATED!! (prev ${article?.price || 'NONE'
                 }) 👀 `)

            const message = `<b>${vendor.name} - ${item.name}</b>\n${article?.price || 'NONE'
                 } => ${price}\n<a href='${item.url}'>LINK</a>`
            await bot
              .sendPhoto(chatId, image, { parse_mode: 'HTML', caption: message })

            const date = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
            if (article) {
              article.price = price
              article.date = date
              await updateCells(article)
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

              const cells = await addRow(obj)
              articles.push({ ...obj, cells })
            }
          }

          await page.close()
          await context.close()
        }
      }
    }

    await updateLastScrap()

    console.log(`\n\n🏁 SCRAP FINISHED (${(new Date()).toLocaleTimeString()}) - ${(new Date((new Date()).getTime() - startDate.getTime())).getSeconds()}s\n\n- - - - - - -`)
  } catch (err) {
    logger.color('black').bgColor('red').log(` ${err.message.split('=')[0].trim()} `)
    await bot.sendMessage(chatId, `Err on browser (${err.message.split('=')[0].trim()})`)
  }

  setTimeout(() => {
    // Scrap after 30s after finishing
    scrap()
  }, 30 * 1000)
})()
