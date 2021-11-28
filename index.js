require('dotenv').config()
const { CHATID, HEADLESS, SERVERID } = process.env

const md5 = require('md5-nodejs')

const { firefox } = require('playwright')
const { vendorsObj } = require('./vendors/vendorsObj')
const { initializeDb, getItemsFromDb, updatePrice, updateLastScrap, updateKey, getVendorsFromDB } = require('./db/db.js')
const { bot, initializeBotListeners } = require('./telegram/bot')
const { getTimeString } = require('./utils')
const { logs } = require('./log/logs')

let items = null
let browser = null
let activeVendors = null

const scrapInitialization = async () => {
  if (!items) {
    await initializeDb(bot)
    await initializeBotListeners()
  }

  activeVendors = (await getVendorsFromDB()).activeVendors

  if (!browser || !browser.isConnected()) {
    logs.dim(`\n\n${activeVendors.map(vendor => vendor.key).join(' | ')}`)
    logs.log('\n\n- - - - -')

    browser = await firefox.launch({ headless: HEADLESS !== 1 })
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID || 'NONE'})</b> · Browser launched`,
       { parse_mode: 'HTML' }
    )
    logs.dim('\nBrowser launched')

    browser.on('disconnected', async () => {
      logs.error('\n ⚠️  Browser disconected')
      await bot.sendMessage(
        CHATID,
         `<b>(${SERVERID || 'NONE'})</b> · Browser disconected`,
         { parse_mode: 'HTML' }
      )
    })
  }

  items = await getItemsFromDb(bot)
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
    price = (await vendor.checkPrice({ context, page }))
    logs.log(`\t${item.name} · ${price}`)
  } catch (err) {
    await bot.sendMessage(
      CHATID,
      `${vendor.name} - ${item.name} · Err (${err.message.split('=')[0].trim()})`
    )
    logs.error(`${item.name} · (${err.message.split('=')[0].trim()})`)
  }

  return price
}

const handleScreenshot = async ({ page, vendor, item, image }) => {
  try {
    await page.screenshot({
      path: `screenshots/full/${vendor.name}_${item.name}_full.png`,
      fullPage: true
    })
    image = await page.screenshot({ path: `screenshots/${vendor.name}_${item.name}.png` })
  } catch (err) {
    await bot.sendMessage(
      CHATID,
      `${vendor.name} - ${item.name} · Err on screenshot (${err.message.split('=')[0].trim()})`
    )
    logs.error(`Err on screenshot (${err.message.split('=')[0].trim()})`)
  }

  return image
}

const handleUpdated = async ({ vendor, item, price, image, key }) => {
  logs.success(`UPDATED!! (${item?.price || 'NONE'
    } => ${price}) 👀`)

  const message = `<b>${vendor.name} - ${item.name}</b>\n${item?.price || 'NONE'} => ${price}\n<a href='${item.url}'>LINK</a>`
  await bot.sendPhoto(CHATID, image, { parse_mode: 'HTML', caption: message })

  if (item && price !== 'CAPTCHA') {
    item.price = price
    item.date = `${(new Date()).toDateString()} ${getTimeString()}`
    await updatePrice(bot, item)
  }
}

  ; (async function scrap () {
  try {
    const startDate = new Date()
    logs.log(`\n🔎 START SCRAPPING... (${getTimeString(startDate)})`)

    await scrapInitialization()

    const vendors = vendorsObj
      .sort((a, b) => a.key < b.key ? -1 : (a.key > b.key ? 1 : 0))
      .filter(vendorObj => activeVendors.map(vendor => vendor.key).includes(vendorObj.key))

    for (const vendor of vendors) {
      logs.bold(`\n${vendor.name}`).joint().dim().log(`${vendor.jsEnabled ? ' (JS enabled)' : ''}`)

      const activeItems = items.filter(item =>
        item.vendor === vendor.key
      ).filter(item =>
        item.active
      )

      if (activeItems.length === 0) {
        logs.dim('\tNo active items')
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

          if (price && item.price !== price) {
            await handleUpdated({ vendor, item, price, image, key })
          }

          await page.close()
          await context.close()
        }
      }
    }

    const endDate = new Date()
    const totalSeconds = (new Date(endDate.getTime() - startDate.getTime())).getSeconds()
    logs.log(`\n\n🏁 SCRAP FINISHED (${getTimeString(endDate)}) - ${totalSeconds}s\n\n- - - - - - -`)

    await updateLastScrap({ bot, endDate, totalSeconds })
  } catch (err) {
    logs.error(`${err.message.split('=')[0].trim()}`)
    await bot.sendMessage(CHATID, `Err on scrap (${err.message.split('=')[0].trim()})`)
  }

  setTimeout(() => {
    // Scrap again after 30s
    scrap()
  }, 30 * 1000) // 30s
})()

;['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'SIGTERM', 'SIGKILL'].forEach((eventType) => {
  process.on(eventType, async (ev) => {
    process.stdin.resume()

    await bot.sendMessage(CHATID, `CRITICAL (${ev})`)
    logs.error(`CRITICAL (${ev})`)
    process.exit(99)
  })
})
