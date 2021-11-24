process.env.NTBA_FIX_350 = 1

const TelegramBot = require('node-telegram-bot-api')
const logger = require('node-color-log')
const { firefox } = require('playwright')

const { getPricesFromDb, updateDb } = require('./db/utils.js')

const vendorsData = require('./vendorsData.json')
const { vendors } = require('./vendors')

const prices = getPricesFromDb()

const token = '2116509217:AAHb4ahdyClWddAzENE5WY4qR6Fkp9qlDjk'
const bot = new TelegramBot(token, { polling: true })
const chatId = 133337935

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
      bot.sendMessage(chatId, 'Yas!')
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

async function scrap () {
  try {
    console.log(`\n\nSTART SCRAPPING... (${(new Date()).toLocaleTimeString()})`)

    const browser = await firefox.launch({ headless: true })

    for (const vendor of vendors) {
      console.log(`\n\t${vendor.name}`)

      // const promises = []
      const items = vendor.items[chatId].filter(item => item.active)
      if (items.length === 0) {
        console.log('\t\tNo active items')
      } else {
        for (const item of items) {
          const context = await browser.newContext({
            javaScriptEnabled: false
          })
          context.setDefaultTimeout(5000)
          // promises.push(new Promise((resolve, reject) => {
          // (async () => {
          // try {
          const page = await context.newPage()

          const key = `${vendor.key}_${item.article}`.replaceAll(' ', '')

          let price = null
          let image = null

          try {
            await page.goto(item.url, { waitUntil: 'load' })

            price = (await vendor.checkPrice({ page }))
            console.log(`\t\t%c${item.article} · ${price}`, 'background:red')
          } catch (err) {
            console.error(err)
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · (err)`)
            logger.color('black').bgColor('red').log(`\t\t${item.article} · (err)`)
          }

          try {
            image = await page.screenshot({ path: `screenshots/${key}.png` })
          } catch (err) {
            bot.sendMessage(chatId, `${vendor.name} - ${item.article} · Err on screenshot`)
            console.error('Err on screenshot', err)
          }

          if (price && (!prices[key] || prices[key] !== price)) {
            logger.color('black').bgColor('green').log('\t\t\tUPDATED!! 👀 \t')

            const message = `<b>${vendor.name} - ${item.article}</b>\n${prices[key] || 'NONE'
              } => ${price}\n<a href='${item.url}'>LINK</a>`
            bot
              .sendPhoto(chatId, image, { parse_mode: 'HTML', caption: message })
              .then(() => 'Telegram mensage sent').catch(() => { })

            prices[key] = price
          }

          await page.close()
          // resolve(true)
          // } catch (e) { reject(e) }
          // })()
          // }))
        }
      }

      // await Promise.all(promises)
    }

    updateDb(prices)

    await browser.close()

    console.log(`\n\nSCRAP FINISHED (${(new Date()).toLocaleTimeString()})`)
  } catch (e) {
    console.error(e)
    bot.sendMessage(chatId, 'Err on browser')
  }

  setTimeout(() => {
    // Scrap after 1 minute after finishing
    scrap()
  }, 1 * 60 * 1000)
}

scrap()

setInterval(() => {
  bot.sendMessage(chatId, 'Still alive! 🤘🏼 (pc)')
}, 2 * 60 * 60 * 1000) // 2 hours
