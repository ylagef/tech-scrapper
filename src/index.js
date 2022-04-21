require('dotenv').config()
const { CHATID, SERVERID, MINUTES } = process.env

const { vendorsObj } = require('./vendors/vendors-obj')
const {
  initializeDb,
  getItemsFromDb,
  updatePrice,
  updateLastScrap,
  updateKey,
  getVendorsFromDB
} = require('./db/db.js')
const { initializeBotListeners } = require('./telegram/bot-functions')
const { getTimeString } = require('./utils')
const { logs } = require('./log/logs')
const { bot } = require('./telegram/bot')
const puppeteer = require('puppeteer-extra')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

let items = null
let browser = null
let activeVendors = null

let totalSeconds = 0

const scrapInitialization = async () => {
  if (!items) {
    await initializeDb()
    await initializeBotListeners()
  }

  activeVendors = (await getVendorsFromDB()).activeVendors

  if (!browser || !browser.isConnected()) {
    logs.dim(`\n\n${Object.keys(activeVendors).join(' | ')}`)
    logs.log('\n\n- - - - -')

    try {
      browser = await puppeteer.launch()
    } catch (err) {
      logs.error(`Error on launch: ${err.message}`)
      process.exit(1)
    }

    await bot.sendMessage(CHATID, `<b>(${SERVERID})</b> · Browser launched`, {
      parse_mode: 'HTML',
      disable_notification: true
    })
    logs.dim('\nBrowser launched')

    browser.on('disconnected', async () => {
      logs.error('\n ⚠️  Browser disconected')
      await bot.sendMessage(
        CHATID,
        `<b>(${SERVERID})</b> · Browser disconected`,
        { parse_mode: 'HTML' }
      )
    })
  }

  items = await getItemsFromDb()
}

const checkItem = async ({ item, vendor }) => {
  if (!item.key) {
    logs.success(`NEW ITEM FOUND ${item.name}`)
    await updateKey({ bot, item, vendor })
  }
}

const handleNavigation = async ({ page, vendor, item, context, price }) => {
  try {
    await page.goto(item.url, { waitUntil: 'load' })
    price = await vendor.checkPrice({ context, page })
    logs.log(`\t${item.name} · ${price}`)
  } catch (err) {
    await bot.sendMessage(
      CHATID,
      `${vendor.name} - ${item.name} · Err (${err.message
        .split('=')[0]
        .trim()})`,
      { disable_notification: true }
    )
    logs.error(`${item.name} · (${err.message.split('=')[0].trim()})`)
  }

  return price
}

const handleScreenshot = async ({ page, vendor, item, image }) => {
  const itemName = item.name.replace(/\s/g, '').toLowerCase()
  try {
    await page.screenshot({
      path: `screenshots/full/${vendor.key}_${itemName}_full.png`,
      fullPage: true
    })
    image = await page.screenshot({
      path: `screenshots/${vendor.key}_${itemName}.png`
    })
  } catch (err) {
    await bot.sendMessage(
      CHATID,
      `${vendor.name} - ${item.name} · Err on screenshot (${err.message
        .split('=')[0]
        .trim()})`,
      { disable_notification: true }
    )
    logs.error(`Err on screenshot (${err.message.split('=')[0].trim()})`)
  }

  return image
}

const handleUpdated = async ({ vendor, item, price, image }) => {
  if (item) {
    const opts = { parse_mode: 'HTML' }

    if (price === 'CAPTCHA' || price === 'NOT FOUND 😵') {
      opts.disable_notification = true
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n${price}\n<a href='${item.url}'>LINK</a>`
    } else {
      logs.success(`UPDATED!! (${item?.price || 'NONE'} => ${price}) 👀`)

      opts.disable_notification = false
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n${
        item?.price || 'NONE'
      } => ${price}\n<a href='${item.url}'>LINK</a>`

      item.price = price
      item.date = `${new Date().toDateString()} ${getTimeString()}`

      await updatePrice(item)
      await bot.sendPhoto(CHATID, image, opts)
    }
  }
}

;(async function scrap() {
  try {
    const startDate = new Date()
    logs.log(`\n🔎 START SCRAPPING... (${getTimeString(startDate)})`)

    await scrapInitialization()

    const vendors = vendorsObj
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .filter((vendorObj) => Object.keys(activeVendors).includes(vendorObj.key))

    for (const vendor of vendors) {
      logs
        .bold(`\n${vendor.name}`)
        // .joint()
        // .dim()
        // .log(`${vendor.jsEnabled ? ' (JS enabled)' : ''}`)

      const activeItems = items
        .filter((item) => item.vendor === vendor.key)
        .filter((item) => item.active)

      if (activeItems.length === 0) {
        logs.dim('\tNo active items')
      } else {
        for (const item of activeItems) {
          await checkItem({ item, vendor })

          const context = await browser.createIncognitoBrowserContext()
          //  await browser.newContext({
          //   javaScriptEnabled: vendor.jsEnabled
          // })

          // context.setDefaultTimeout(10000)
          // if (vendor.auth) {
          //   context.storageState(`state-keys/${vendor.key}.json`)
          // }

          const page = await context.newPage()

          let price = null
          let image = null

          price = await handleNavigation({
            page,
            vendor,
            item,
            context,
            price
          })

          // if (vendor.auth) {
          //   await context.storageState({
          //     path: `state-keys/${vendor.key}.json`
          //   })
          // }

          image = await handleScreenshot({ page, vendor, item, image })

          if (price && item.price !== price) {
            await handleUpdated({ vendor, item, price, image })
          }

          await page.close()
          await context.close()
        }
      }
    }

    const endDate = new Date()
    totalSeconds = Math.ceil((endDate - startDate) / 1000)
    const minutesSeconds = `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
    logs.log(
      `\n\n🏁 SCRAP FINISHED (${getTimeString(
        endDate
      )}) - ${minutesSeconds}\n\n- - - - - - -`
    )

    await updateLastScrap({ bot, endDate, minutesSeconds })
  } catch (err) {
    logs.error(`${err.message.split('=')[0].trim()}`)
    await bot.sendMessage(
      CHATID,
      `Err on scrap (${err.message.split('=')[0].trim()})`
    )
  }

  // Scrap again each ${MINUTES} minutes
  if (totalSeconds >= MINUTES * 60) {
    scrap()
  } else {
    setTimeout(() => {
      scrap()
    }, (MINUTES * 60 - totalSeconds) * 1000)
  }
})()

process.on('uncaughtException', async (ev) => {
  process.stdin.resume()

  await bot.sendMessage(CHATID, `CRITICAL (${ev})`)
  logs.error(`CRITICAL (${ev})`)
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logs.info('SIGTERM signal')

  try {
    await browser.close()
  } catch (e) {
    logs.error('Error on close browser')
  }

  process.exit(1)
})
