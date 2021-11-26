require('dotenv').config()
const { CHATID, ACTIVEVENDORS, HEADLESS, SERVERID } = process.env

const md5 = require('md5-nodejs')

const logger = require('node-color-log')
const { firefox } = require('playwright')
const { vendorsObj } = require('./vendors/vendorsObj')
const { initializeDb, getItemsFromDb, updatePrice, addRow, updateLastScrap, updateKey } = require('./db/utils.js')
const { bot } = require('./telegram/bot')

let items = null
let browser = null

const activeVendors = ACTIVEVENDORS.split(',')
logger.dim().log(`\n\n${activeVendors.join(' | ')}`)
logger.log('\n\n- - - - -')

const scrapInitialization = async () => {
  if (!browser || !browser.isConnected()) {
    browser = await firefox.launch({ headless: HEADLESS !== 1 })
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Browser launched`, { parse_mode: 'HTML' })
    logger.dim().log('\nBrowser launched')

    browser.on('disconnected', async () => {
      logger.bgColor('red').color('black').log('\n ⚠️  Browser disconected ')
      await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Browser disconected`, { parse_mode: 'HTML' })
    })
  }
  if (!items) {
    await initializeDb(bot)
  }
}

const checkItem = async ({ item, vendor }) => {
  if (!item.key) {
    logger.color('black').bgColor('green').log(` NEW ITEM FOUND ${item.name} `)
    await updateKey({ bot, item, vendor })
  }
}

const handleNavigation = async ({ page, vendor, item, context, price }) => {
  try {
    await page.goto(item.url, { waitUntil: 'load' })
    price = (await vendor.checkPrice({ context, page }))
    console.log(`\t${item.name} · ${price}`)
  } catch (err) {
    await bot.sendMessage(CHATID, `${vendor.name} - ${item.name} · Err (${err.message.split('=')[0].trim()})`)
    logger.color('black').bgColor('red').log(`${item.name} · (${err.message.split('=')[0].trim()}) `)
  }
  return price
}

const handleScreenshot = async ({ page, vendor, item, image }) => {
  try {
    await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}_full.png`, fullPage: true })
    image = await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}.png` })
  } catch (err) {
    await bot.sendMessage(CHATID, `${vendor.name} - ${item.name} · Err on screenshot (${err.message.split('=')[0].trim()})`)
    logger.color('black').bgColor('red').log(` Err on screenshot (${err.message.split('=')[0].trim()}) `)
  }

  return image
}

const handleUpdated = async ({ vendor, item, price, image, key }) => {
  logger.color('black').bgColor('green').log(` UPDATED!! (prev ${item?.price || 'NONE'
    }) 👀 `)

  const message = `<b>${vendor.name} - ${item.name}</b>\n${item?.price || 'NONE'
    } => ${price}\n<a href='${item.url}'>LINK</a>`
  await bot.sendPhoto(CHATID, image, { parse_mode: 'HTML', caption: message })

  const date = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
  if (item) {
    item.price = price
    item.date = date
    await updatePrice(bot, item)
  } else {
    const obj = {
      date,
      key,
      vendor: vendor.name,
      name: item.name,
      price,
      active: item.active,
      url: item.url
    }

    await addRow(bot, obj)
  }
}

  ; (async function scrap () {
  try {
    const startDate = new Date()
    console.log(`\n🔎 START SCRAPPING... (${startDate.toLocaleTimeString()})`)

    await scrapInitialization()

    items = await getItemsFromDb(bot)

    const vendors = vendorsObj.filter(vendor => activeVendors.includes(vendor.key))

    for (const vendor of vendors) {
      logger.bold().log(`\n${vendor.name}`).joint().dim().log(` ${vendor.jsEnabled ? '(JS enabled)' : ''}`)

      const activeItems = items.filter(item =>
        item.vendor === vendor.key
      ).filter(item =>
        item.active === 'TRUE'
      )

      if (activeItems.length === 0) {
        console.log('\tNo active items')
      } else {
        for (const item of activeItems) {
          await checkItem({ item, vendor })

          const context = await browser.newContext({
            javaScriptEnabled: vendor.jsEnabled
          })
          context.setDefaultTimeout(10000)

          const page = await context.newPage()

          const key = md5(`${vendor.key}${item.name}${item.url}`)

          let price = null
          let image = null

          price = await handleNavigation({ page, vendor, item, context, price })

          image = await handleScreenshot({ page, vendor, item, image })

          if (price && (!item || item.price !== price)) {
            await handleUpdated({ vendor, item, price, image, key })
          }

          await page.close()
          await context.close()
        }
      }
    }

    const endDate = new Date()
    const totalSeconds = (new Date(endDate.getTime() - startDate.getTime())).getSeconds()
    console.log(`\n\n🏁 SCRAP FINISHED (${endDate.toLocaleTimeString()}) - ${totalSeconds}s\n\n- - - - - - -`)

    await updateLastScrap({ bot, endDate, totalSeconds })
  } catch (err) {
    logger.color('black').bgColor('red').log(` ${err.message.split('=')[0].trim()} `)
    await bot.sendMessage(CHATID, `Err on browser (${err.message.split('=')[0].trim()})`)
  }

  setTimeout(() => {
    // Scrap again after 30s
    scrap()
  }, 30 * 1000) // 30s
})()
