import 'dotenv/config'
import { SendPhotoOptions } from 'node-telegram-bot-api'
import { Browser } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
  getItemsFromDb,
  getVendorsFromDB,
  initializeDb,
  Item,
  updateKey,
  updateLastScrap,
  updatePrice
} from './db/db.js'
import { clearLogs, logs } from './log/logs.js'
import { initializeBotListeners } from './telegram/bot-functions.js'
import { bot } from './telegram/bot.js'
import { getTimeString } from './utils.js'
import { vendorsObj } from './vendors/vendors-obj.js'
const { CHATID, SERVERID, MINUTES } = process.env

puppeteer.use(StealthPlugin())

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

let items: Item[] = null
let browser: Browser = null
let activeVendors: {} = null

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
    logs.debug('1')
    await page.goto(item.url, { waitUntil: 'load' })
    logs.debug('2')
    price = await vendor.checkPrice({ context, page })
    logs.debug('3')
    logs.log(`\t${item.name} · ${price}`)
  } catch (err) {
    logs.debug('4')
    await bot.sendMessage(
      CHATID,
      `${vendor.name} - ${item.name} · Err (${err.message
        .split('=')[0]
        .trim()})`,
      { disable_notification: true }
    )
    logs.debug('5')
    logs.error(`${item.name} · (${err.message.split('=')[0].trim()})`)
    logs.debug('6')
  }
  logs.debug('7')

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
    // await bot.sendMessage(
    //   CHATID,
    //   `${vendor.name} - ${item.name} · Err on screenshot (${err.message
    //     .split('=')[0]
    //     .trim()})`,
    //   { disable_notification: true }
    // )
    logs.error(`Err on screenshot (${err.message.split('=')[0].trim()})`)
  }

  return image
}

const handleUpdated = async ({ vendor, item, price, image }) => {
  if (item) {
    const opts: SendPhotoOptions = { parse_mode: 'HTML' }

    if (price === 'CAPTCHA' || price === 'NOT FOUND 😵') {
      opts.disable_notification = true
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n${price}\n<a href='${item.url}'>LINK</a>`
    } else {
      logs.success(`UPDATED!! (${item?.price || 'NONE'} => ${price}) 👀`)

      opts.disable_notification = false
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n\n${
        item?.price || 'NONE'
      } \n↓ ↓ ↓ ↓ ↓\n${price}\n\n<a href='${item.url}'>LINK</a>`

      item.price = price
      item.date = `${new Date().toDateString()} ${getTimeString()}`

      await updatePrice(item)
      await bot.sendPhoto(CHATID, image, opts)
    }
  }
}

;(async function scrap() {
  try {
    clearLogs() // Reset last logs

    const startDate = new Date()
    logs.log(`\n🔎 START SCRAPPING... (${getTimeString(startDate)})`)

    await scrapInitialization()

    const vendors = vendorsObj
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .filter((vendorObj) => Object.keys(activeVendors).includes(vendorObj.key))

    for (const vendor of vendors) {
      logs.bold(`\n${vendor.name}`)
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
          logs.debug('check item ' + item.name)
          await checkItem({ item, vendor })
          logs.debug('item checked ✔')

          logs.debug('create context')
          const context = await browser.createIncognitoBrowserContext()
          logs.debug('context created ✔')
          //  await browser.newContext({
          //   javaScriptEnabled: vendor.jsEnabled
          // })

          // context.setDefaultTimeout(10000)
          // if (vendor.auth) {
          //   context.storageState(`state-keys/${vendor.key}.json`)
          // }
          logs.debug('create page')
          const page = await context.newPage()
          await page.setViewport({
            width: 1920,
            height: 1080
          })
          logs.debug('page created ✔')

          let price = null
          let image = null

          price = await handleNavigation({
            page,
            vendor,
            item,
            context,
            price
          })
          logs.debug('8')

          // if (vendor.auth) {
          //   await context.storageState({
          //     path: `state-keys/${vendor.key}.json`
          //   })
          // }
          logs.debug('9')
          image = await handleScreenshot({ page, vendor, item, image })
          logs.debug(`10 ${price} ${item.price}`)
          if (price && item.price !== price) {
            await handleUpdated({ vendor, item, price, image })
          }
          logs.debug('11')
          await page.close()
          await context.close()
          logs.debug('12')
        }
      }
    }

    const endDate = new Date()
    totalSeconds = Math.ceil((endDate.getTime() - startDate.getTime()) / 1000)
    const minutesSeconds = `${Math.floor(totalSeconds / 60)}m ${
      totalSeconds % 60
    }s`
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
  if (totalSeconds >= +MINUTES * 60) {
    scrap()
  } else {
    setTimeout(() => {
      scrap()
    }, (+MINUTES * 60 - totalSeconds) * 1000)
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
