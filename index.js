const { firefox } = require('playwright')

const { getPricesFromDb, updateDb } = require('./db/utils.js')

const { vendors } = require('./vendors')

console.log('started!')
const prices = getPricesFromDb()
console.log({ prices })

const TelegramBot = require('node-telegram-bot-api')

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: false })
const chatId = 133337935

async function scrap () {
  try {
    console.log('\n\nSTART SCRAPPING...')

    const browser = await firefox.launch({ headless: true })

    for (const vendor of vendors) {
      console.log(`\n\t${vendor.name}`)

      for (const item of vendor.items) {
        const context = await browser.newContext({
          javaScriptEnabled: false
        })
        context.setDefaultTimeout(2000)
        const page = await context.newPage()

        const key = `${vendor.key}_${item.article}`.replace(' ', '')

        let price = null
        let image = null

        try {
          await page.goto(item.url, { waitUntil: 'domcontentloaded' })
          image = await page.screenshot({ path: `screenshots/${key}.png` })
          price = (await vendor.checkPrice({ page })).replace(' ', '')
          console.log(`\t\t${item.article} - ${price}`)
        } catch (err) {
          // console.error(err)
          console.log(`\t\t${item.article} - ERROR`)
        }

        if (price && (!prices[key] || prices[key] !== price)) {
          console.log('\t\t\tUPDATED PRICE!')

          const message = `<b>${vendor.name} - ${item.article}</b>\n${
            prices[key] || 'NONE'
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
