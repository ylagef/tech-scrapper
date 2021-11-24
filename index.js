process.env.NTBA_FIX_350 = 1 // Disable telegram bot deprecation message
require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const logger = require('node-color-log')
const { firefox } = require('playwright')

const { getPricesFromDb, updateDb } = require('./db/utils.js')

const vendorsData = require('./vendorsData.json')
const { vendorsObj } = require('./vendorsObj')

const prices = getPricesFromDb()

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: process.env.LISTENBOT === 1 })
const chatId = 133337935

if (process.env.LISTENBOT === 1) {
  bot.on('polling_error', (error) => {
    console.error(error)
    bot.sendMessage(chatId, 'Err on polling')
  })
  bot.addListener('message', (data) => {
    switch (data.text) {
      case '/vendors':
      {
        const vendorsMessage = Object.values(vendorsData).map(vendor => {
          let message = `<b>${vendor.name}</b>\n`
          message += vendor.items[chatId].map(item => `<a href="${item.url}">${item.article}</a> · ${prices[`${vendor.key}_${item.article}`.replaceAll(' ', '')]}`).join('\n')
          return message
        }).join('\n\n')
        bot.sendMessage(chatId, vendorsMessage, { parse_mode: 'HTML', disable_web_page_preview: true })
        break
      }

      case '/alive':
        bot.sendMessage(chatId, `Yas! (${process.env.SERVER || 'NONE'})`)
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

async function scrap () {
  try {
    console.log(`\n\nSTART SCRAPPING... (${(new Date()).toLocaleTimeString()})`)

    const vendors = vendorsObj.filter(vendor => activeVendors.includes(vendor.key))
    const browser = await firefox.launch({ headless: process.env.HEADLESS !== 1 })

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

          const key = `${vendor.key}_${item.article}`.replaceAll(' ', '')

          let price = null
          let image = null

          try {
            await page.goto(item.url, { waitUntil: 'load' })
            price = (await vendor.checkPrice({ context, page }))
            console.log(`\t${item.article} · ${price}`)
          } catch (err) {
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · Err (${err.message})`)
            logger.color('black').bgColor('red').log(`\t${item.article} · (${err.message})\t`)
          }

          try {
            image = await page.screenshot({ path: `screenshots/${key}.png` })
          } catch (err) {
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · Err on screenshot (${err.message})`)
            logger.color('black').bgColor('red').log(`Err on screenshot (${err.message})`)
          }

          if (price && (!prices[key] || prices[key] !== price)) {
            logger.color('black').bgColor('green').log(`\t\tUPDATED!! (prev ${prices[key] || 'NONE'
              }) 👀\t\t`)

            const message = `<b>${vendor.name} - ${item.article}</b>\n${prices[key] || 'NONE'
              } => ${price}\n<a href='${item.url}'>LINK</a>`
            bot
              .sendPhoto(chatId, image, { parse_mode: 'HTML', caption: message })
              .then(() => 'Telegram mensage sent')

            prices[key] = price
          }

          await page.close()
          await context.close()
        }
      }
    }

    updateDb(prices)

    await browser.close()

    console.log(`\n\nSCRAP FINISHED (${(new Date()).toLocaleTimeString()})`)
  } catch (err) {
    logger.color('black').bgColor('red').log(err.message)
    bot.sendMessage(chatId, `Err on browser (${err.message})`)
  }

  setTimeout(() => {
    // Scrap after 1 minute after finishing
    scrap()
  }, 1 * 60 * 1000)
}

scrap()

setInterval(() => {
  bot.sendMessage(chatId, `Still alive! 🤘🏼 (${process.env.SERVER || 'NONE'})`)
}, 2 * 60 * 60 * 1000) // 2 hours
