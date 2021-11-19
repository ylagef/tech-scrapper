const { firefox } = require('playwright')

const { getPricesFromDb, updateDb } = require('./db/utils.js')

const vendorsData = require('./vendorsData.json')
const { vendors } = require('./vendors')

console.log('started!')
const prices = getPricesFromDb()

const TelegramBot = require('node-telegram-bot-api')

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: true })
const chatId = 133337935


bot.on("polling_error", console.error);
bot.addListener('message', (data) => {
  if (data.text === '/prices') {
    const pricesMessage = Object.entries(prices).map(([key, value]) => `<b>${key}</b> · ${value}`).join('\n').replaceAll('_', " ")
    bot.sendMessage(chatId, pricesMessage, { parse_mode: 'HTML' })
  } else if (data.text === '/vendors') {
    const vendorsMessage = Object.values(vendorsData).map(vendor => {
      let message = `<b>${vendor.name}</b>\n`
      message += vendor.items.map(item => `<a href="${item.url}">${item.article}</a>`).join('\n')
      return message
    }).join('\n\n')
    bot.sendMessage(chatId, vendorsMessage, { parse_mode: 'HTML' })
  }
})

async function scrap() {
  try {
    console.log('\n\nSTART SCRAPPING...')
    console.log((new Date()).toLocaleTimeString())

    const browser = await firefox.launch({ headless: true })

    for (const vendor of vendors) {
      console.log(`\n\t${vendor.name}`)

      for (const item of vendor.items) {
        const context = await browser.newContext({
          javaScriptEnabled: false,


        })
        context.setDefaultTimeout(5000)
        const page = await context.newPage()

        const key = `${vendor.key}_${item.article}`.replace(' ', '')

        let price = null
        let image = null

        try {
          await page.goto(item.url, { waitUntil: 'load' })

          price = (await vendor.checkPrice({ page })).replace(' ', '')
          console.log(`\t\t${item.article} - ${price}`)
        } catch (err) {
          // console.error(err)
          console.log(`\t\t${item.article} - NO STOCK`)
        }

        try {
          image = await page.screenshot({ path: `screenshots/${key}.png` })
        } catch (err) {
          console.error("Err on screenshot", err)
        }


        if (price && (!prices[key] || prices[key] !== price)) {
          console.log('\t\t\tUPDATED PRICE!')

          const message = `<b>${vendor.name} - ${item.article}</b>\n${prices[key] || 'NONE'
            } => ${price}\n<a href='${item.url}'>LINK</a>`
          bot
            .sendPhoto(chatId, image, { parse_mode: 'HTML', caption: message })
            .then(() => 'Telegram mensage sent')

          prices[key] = price
        }

        await page.close()
      }
    }

    updateDb(prices)

    await browser.close()
  } catch (e) {
    console.error(e)
  }
}

scrap()
setInterval(() => {
  scrap()
}, 5 * 60 * 1000) // 5 minutes

setInterval(() => {
  bot.sendMessage(chatId, 'Still alive!')
}, 2 * 60 * 60 * 1000) // 2 hours
