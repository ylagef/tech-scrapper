import 'dotenv/config'
import { SendPhotoOptions } from 'node-telegram-bot-api'
import { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
  addHistoryRow,
  disableItem,
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
import { getMinutesSeconds, getTimeString, getTotalSeconds } from './utils.js'
import { Vendor, vendorsObj } from './vendors/vendors-obj.js'
const { CHAT_ID, SERVER_ID, MINUTES } = process.env

puppeteer.use(StealthPlugin())

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const MAX_CONCURRENT_PROMISES = 5

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

    await bot.sendMessage(
      CHAT_ID,
      `<b>(${SERVER_ID})</b> · Browser launched · ${MINUTES}min/scrap`,
      {
        parse_mode: 'HTML',
        disable_notification: true
      }
    )
    logs.dim('\nBrowser launched')

    browser.on('disconnected', async () => {
      logs.error('⚠️  Browser disconnected')
      await bot.sendMessage(
        CHAT_ID,
        `<b>(${SERVER_ID})</b> · Browser disconnected`,
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

    price = await vendor.checkPrice({ page, item })
  } catch (err) {
    await bot.sendMessage(
      CHAT_ID,
      `${vendor.name} - ${item.name} · Err (${err.message
        .split('=')[0]
        .trim()})`,
      { disable_notification: true }
    )

    logs.error(`${item.name} · (${err.message.split('=')[0].trim()})`)
  }

  return price
}

const handleScreenshot = async ({
  page,
  vendor,
  item
}: {
  page: Page
  vendor: Vendor
  item: Item
}) => {
  const itemName = item.name.replace(/\s/g, '').toLowerCase()

  try {
    const image = await page.screenshot({
      path: `screenshots/${vendor.key}_${itemName}.png`,
      clip: {
        x: 0,
        y: 0,
        width: 1920,
        height: 2160
      }
    })

    return image
  } catch (err) {
    logs.error(`Err on screenshot (${err.message.split('=')[0].trim()})`)
    return null
  }
}

const handleUpdated = async ({ vendor, item, price, image }) => {
  if (item) {
    const opts: SendPhotoOptions = { parse_mode: 'HTML' }

    if (price === 'CAPTCHA' || price === 'NOT FOUND 😵') {
      logs.error(
        price === 'CAPTCHA'
          ? `☠️ · ${item.name} · Captcha detected!`
          : `😵 · ${item.name} · NOT FOUND`
      )

      opts.disable_notification = true
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n${price}\n<a href='${item.url}'>LINK</a>`

      item.price = price
      if (price === 'CAPTCHA') await disableItem(item, true)
    } else {
      logs.warn(
        `\t${item.name} UPDATED (${item?.price || 'NONE'} => ${price}) 👀`
      )

      opts.disable_notification = false
      opts.caption = `<b>${vendor.name} - ${item.name}</b>\n\n${
        item?.price || 'NONE'
      } \n↓ ↓ ↓ ↓ ↓\n${price}\n\n<a href='${item.url}'>LINK</a>`

      item.price = price
      item.date = `${new Date().toDateString()} ${getTimeString()}`

      await updatePrice(item)
      await addHistoryRow(item)
    }

    await bot.sendPhoto(CHAT_ID, image, opts)
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
      const startVendor = new Date()

      const activeItems = items
        .filter((item) => item.vendor === vendor.key)
        .filter((item) => item.active)

      logs
        .bold(`\n${vendor.name}`)
        .joint()
        .dim()
        .log(
          ` (${activeItems.length} item${activeItems.length > 1 ? 's' : ''})`
        )

      if (activeItems.length === 0) {
        logs.dim('\tNo active items')
      } else {
        let itemsPromises = []
        const context = await browser.createIncognitoBrowserContext()

        for (const [index, item] of activeItems.entries()) {
          itemsPromises.push(
            new Promise(async (resolve, reject) => {
              const startItem = new Date()
              await checkItem({ item, vendor })

              const page = await context.newPage()
              await page.setViewport({
                width: 1920,
                height: 1080
              })
              // await page.setDefaultNavigationTimeout(10000) // Change timeout

              let price = null
              let image = null

              price = await handleNavigation({
                page,
                vendor,
                item,
                context,
                price
              })

              if (price && item.price !== price) {
                image = await handleScreenshot({ page, vendor, item })
                await handleUpdated({ vendor, item, price, image })
              }

              await page.close()

              const endItem = new Date()
              const totalItemSeconds = getTotalSeconds(startItem, endItem)

              logs
                .log(`\t${item.name} · ${price}`)
                .joint()
                .dim()
                .log(` (${getMinutesSeconds(totalItemSeconds)})`)

              resolve(true)
            })
          )

          if (
            itemsPromises.length === MAX_CONCURRENT_PROMISES ||
            index === activeItems.length - 1
          ) {
            logs.dim(
              `\t\tExecuting ${itemsPromises.length} promise${
                itemsPromises.length > 1 ? 's' : ''
              }...`
            )
            await Promise.allSettled(itemsPromises)
            itemsPromises = []
          }
        }

        await context.close()
      }

      const endVendor = new Date()
      const totalVendorSeconds = getTotalSeconds(startVendor, endVendor)
      logs.dim(`\t${getMinutesSeconds(totalVendorSeconds)}`)
    }

    const endDate = new Date()
    totalSeconds = getTotalSeconds(startDate, endDate)
    const minutesSeconds = getMinutesSeconds(totalSeconds)
    logs.log(
      `\n\n🏁 SCRAP FINISHED (${getTimeString(
        endDate
      )}) - ${minutesSeconds}\n\n- - - - - - -`
    )

    await updateLastScrap({ bot, endDate, minutesSeconds })
  } catch (err) {
    logs.error(`${err.message.split('=')[0].trim()}`)
    await bot.sendMessage(
      CHAT_ID,
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

  await bot.sendMessage(CHAT_ID, `CRITICAL (${ev})`)
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
