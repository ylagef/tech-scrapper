const { CHATID, LISTENBOT, SERVERID } = process.env
import fs from 'fs'
import md5 from 'md5-nodejs'
import { SendMessageOptions } from 'node-telegram-bot-api'
import {
  addRow,
  getItemsFromDb,
  getLastScrap,
  getVendorsFromDB,
  updateVendor
} from '../db/db.js'
import { getLastLogs, logs } from '../log/logs.js'
import { getTimeString } from '../utils.js'
import { vendorsObj } from '../vendors/vendors-obj.js'
import { bot } from './bot.js'

export const initializeBotListeners = async () => {
  logs.dim('\nInitializing bot listeners...')

  const listenForUrl = ({ urlMessage, newItem, vendor, name }) => {
    logs.info(`Listening for url ${urlMessage.message_id}`)

    bot.onReplyToMessage(
      urlMessage.chat.id,
      urlMessage.message_id,
      async (msg) => {
        const url = msg.text

        newItem.url = url
        newItem.vendor = vendor
        newItem.key = md5(`${vendor}${name}${url}`)
        newItem.date = `${new Date().toDateString()} ${getTimeString()}`

        await addRow(newItem)

        logs.success(`${name} was added! 💪🏼`)
        await message({ msg: `${name} was added!` })
      }
    )
  }

  const listenForName = async ({ nameMessage, newItem, vendor }) => {
    try {
      logs.info(`Listening for name ${nameMessage.id}`)

      bot.onReplyToMessage(
        nameMessage.chat.id,
        nameMessage.message_id,
        async (msg) => {
          const name = msg.text

          newItem.name = name
          const urlMessage = await message({
            msg: `${name}'s url?`,
            opts: {
              reply_markup: {
                force_reply: true
                // input_field_placeholder: 'Url of the item'
              }
            }
          })

          listenForUrl({ urlMessage, newItem, vendor, name })
        }
      )
    } catch (err) {
      logs.error(`Error on listen for name ${err.message}`)
      await message({ msg: `Error on listen for name ${err.message}` })
    }
  }

  const handleNew = async ({ action }) => {
    try {
      const newItem = { active: true }

      const vendor = action.split('_')[1]
      logs.info(`Selected ${vendor}`)
      const nameMessage = await message({
        msg: 'Item name?',
        opts: {
          reply_markup: {
            force_reply: true
            // input_field_placeholder: 'Name of the item'
          }
        }
      })

      listenForName({ nameMessage, newItem, vendor })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
      await message({ msg: `Error on add new ${err.message}` })
    }
  }

  const handlePrices = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[1]

      logs.info(`Selected ${selectedVendor}`)

      const items = await getItemsFromDb()
      const vendors = Object.keys(
        (await getVendorsFromDB()).allVendors[SERVERID]
      ).filter((vendor) =>
        selectedVendor !== 'all' ? vendor === selectedVendor : true
      )

      const msg = vendors
        .map((vendor) => {
          let vendorMessage = `<b>${
            vendorsObj.find((vendorObj) => vendorObj.key === vendor).name
          }</b>\n`
          vendorMessage += items
            .sort((a, b) => (a.key < b.key ? -1 : a.vendor > b.vendor ? 1 : 0))
            .filter((item) => item.vendor === vendor)
            .map(
              (item) =>
                `         ${item.name} · <a href="${item.url}">${item.price}</a>`
            )
            .join('\n')
          return vendorMessage
        })
        .join('\n\n')

      await message({ msg, html: true, disablePreview: true })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
      await message({ msg: 'Error on add new' })
    }
  }

  const handleUpdateVendor = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[2]

      logs.info(`Selected ${selectedVendor}`)

      const keyboard = [
        [
          {
            text: 'Enable',
            callback_data: `update_vendor_enable_${selectedVendor}`
          }
        ],
        [
          {
            text: 'Disable',
            callback_data: `update_vendor_disable_${selectedVendor}`
          }
        ]
      ]
      const opts = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }

      await message({
        msg: `What do you want to do with ${selectedVendor}?`,
        opts
      })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
      await message({ msg: 'Error on add new' })
    }
  }

  const handleUpdateVendorEnableDisable = async ({ action }) => {
    try {
      const state = action.split('_')[2]
      const vendor = action.split('_')[3]

      logs.info(`Selected ${state}`)

      await updateVendor({ bot, state, vendor })
      await message({ msg: `${vendor} is now ${state}d` })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
      await message({ msg: 'Error on add new' })
    }
  }

  const handleVendorState = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[2]
      const all = selectedVendor === 'all'
      logs.info(`Selected ${selectedVendor}`)

      const vendors = (await getVendorsFromDB()).allVendors[SERVERID]

      let msg = ''
      if (all) {
        msg = Object.entries(vendors)
          .map(
            ([vendor, state]) =>
              `${state ? '🟢' : '🔴'} <b>${
                vendorsObj.find((v) => v.key === vendor).name
              }</b>`
          )
          .join('\n')
      } else {
        const state = vendors[selectedVendor]
        msg = `${state ? '🟢' : '🔴'} <b>${
          vendorsObj.find((v) => v.key === selectedVendor).name
        }</b>`
      }

      await message({ msg, html: true })
    } catch (err) {
      logs.error(`Error on vendor state ${err.message}`)
      await message({ msg: 'Error on vendor state' })
    }
  }

  const handleLastScreenshotVendor = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[2]
      logs.info(`Selected ${selectedVendor}`)

      const items = await getItemsFromDb()
      const vendorItems = items.filter((item) => item.vendor === selectedVendor)

      const opts = {
        reply_markup: {
          inline_keyboard: getItemsKeyboard({
            key: 'screenshot_item',
            items: vendorItems
          })
        }
      }

      await message({ msg: 'Select the item', opts })
    } catch (err) {
      logs.error(`Error on screenshot vendor ${err.message}`)
      await message({ msg: 'Error on screenshot vendor' })
    }
  }

  const handleLastScreenshotItem = async ({ action }) => {
    try {
      const selectedItemCells = action.split('_')[2]
      const full = action.split('_')[3] === 'full'
      logs.info(`Selected ${selectedItemCells} ${full ? 'full' : ''}`)

      const items = await getItemsFromDb()
      const item = items.find((item) => item.cells === selectedItemCells)

      const itemName = item.name.replace(/\s/g, '').toLowerCase()
      const path = full
        ? `screenshots/full/${item.vendor}_${itemName}_full.png`
        : `screenshots/${item.vendor}_${itemName}.png`

      let image = null
      try {
        image = await fs.readFileSync(path)
      } catch (err) {
        logs.error(`Error on screenshot item (read file) ${err.message}`)
        await message({
          msg: `FILE NOT FOUND - ${item.vendor} · ${item.name}`
        })
        return
      }
      await bot.sendPhoto(CHATID, image, { caption: item.name })
    } catch (err) {
      logs.error(`Error on screenshot item ${err.message}`)
      await message({ msg: 'Error on screenshot item' })
    }
  }

  if (LISTENBOT === '1') {
    bot.on('polling_error', async (error) => {
      logs.error(`Err on polling ${error.message}`)
      await message({ msg: `Err on polling ${error.message}` })
    })

    bot.on('webhook_error', async (error) => {
      logs.error(`Err on webhook ${error.message}`)
      await message({ msg: `Err on webhook ${error.message}` })
    })

    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data

      if (action.startsWith('new_')) {
        await handleNew({ action })
      } else if (action.startsWith('prices_')) {
        await handlePrices({ action })
      } else if (
        action.startsWith('update_vendor_enable') ||
        action.startsWith('update_vendor_disable')
      ) {
        await handleUpdateVendorEnableDisable({ action })
      } else if (action.startsWith('update_vendor')) {
        await handleUpdateVendor({ action })
      } else if (action.startsWith('vendor_state')) {
        await handleVendorState({ action })
      } else if (action.startsWith('screenshot_vendor')) {
        await handleLastScreenshotVendor({ action })
      } else if (action.startsWith('screenshot_item')) {
        await handleLastScreenshotItem({ action })
      }
    })

    bot.onText(/\/restart/, async () => {
      try {
        logs.info('Asked for restart')

        process.exit()
      } catch (err) {
        logs.error(`Error on restart ${err.message}`)
        await message({ msg: 'Error on restart' })
      }
    })

    bot.onText(/\/lastscrap/, async () => {
      try {
        logs.info('Asked for last scrap')

        const msg = await getLastScrap()
        await message({
          msg,
          html: true
        })
      } catch (err) {
        logs.error(`Error on get last scrap ${err.message}`)
        await message({ msg: 'Error on get last scrap' })
      }
    })

    bot.onText(/\/new/, async (msg) => {
      try {
        logs.info('New requested')

        const opts = {
          reply_to_message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'new' })
          }
        }

        await message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on add new (select vendor) ${err.message}`)
        await message({ msg: 'Error on add new (select vendor)' })
      }
    })

    bot.onText(/\/prices/, async () => {
      try {
        logs.info('Prices requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({
              key: 'prices',
              allOption: true
            })
          }
        }

        await message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on prices (select vendor) ${err.message}`)
        await message({ msg: 'Error on prices (select vendor)' })
      }
    })

    bot.onText(/\/updatevendor/, async () => {
      try {
        logs.info('Update vendor requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'update_vendor' })
          }
        }

        await message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on update vendor (select vendor) ${err.message}`)
        await message({ msg: 'Error on update vendor (select vendor)' })
      }
    })

    bot.onText(/\/vendorstate/, async () => {
      try {
        logs.info('Vendor state requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({
              key: 'vendor_state',
              allOption: true
            })
          }
        }

        await message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on vendor state (select vendor) ${err.message}`)
        await message({ msg: 'Error on vendor state (select vendor)' })
      }
    })

    bot.onText(/\/lastlogs/, async () => {
      try {
        logs.info('Asked for last logs')

        const lastLogs = getLastLogs()
        await bot.sendMessage(CHATID, lastLogs, {
          parse_mode: 'HTML'
        })
      } catch (err) {
        logs.error(`Error on get last logs ${err.message}`)
        await message({ msg: 'Error on get last logs' })
      }
    })
    bot.onText(/\/lastscreenshot/, async () => {
      try {
        logs.info('Last screenshot requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({
              key: 'screenshot_vendor'
            })
          }
        }

        await message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on last screenshot (select vendor) ${err.message}`)
        await message({ msg: 'Error on last screenshot (select vendor)' })
      }
    })
  }
}

const getVendorsKeyboard = async ({
  key,
  filterActive = false,
  allOption = false
}) => {
  const keyboard = []

  try {
    let vendors = (await getVendorsFromDB())[
      filterActive ? 'activeVendors' : 'allVendors'
    ]
    if (!filterActive) vendors = vendors[SERVERID]

    const vendorKeys = Object.keys(vendors)
      .sort()
      .map((vendor) => ({
        text: vendorsObj.find((vendorObj) => vendorObj.key === vendor)?.name,
        callback_data: `${key}_${vendor}`
      }))

    for (let i = 0; i < vendorKeys.length; i++) {
      const index = Math.floor(i / 2)

      if (!keyboard[index]) keyboard[index] = []
      keyboard[index].push(vendorKeys[i])
    }

    if (allOption) {
      keyboard.unshift([
        {
          text: 'All',
          callback_data: `${key}_all`
        }
      ])
    }
  } catch (err) {
    logs.error(`Error on get vendors keyboard ${err.message}`)
  }

  return keyboard
}

const getItemsKeyboard = ({ key, items }) => {
  let keyboard = []

  if (items.length > 0) {
    keyboard = items
      .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0))
      .map((item) => [
        {
          text: item.name,
          callback_data: `${key}_${item.cells}`
        },
        {
          text: `${item.name} (FULL)`,
          callback_data: `${key}_${item.cells}_full`
        }
      ])
  } else {
    keyboard = []
  }

  return keyboard
}

export const message = async ({
  msg,
  html = false,
  disablePreview = false,
  opts = {}
}: {
  msg: string
  html?: boolean
  disablePreview?: boolean
  opts?: SendMessageOptions
}) => {
  let message = null

  try {
    if (html) opts.parse_mode = 'HTML'
    opts.disable_web_page_preview = disablePreview

    message = await bot.sendMessage(CHATID, msg, opts)
  } catch (err) {
    logs.error(`Error on send message ${err.message}`)
    message = await bot.sendMessage(
      CHATID,
      `Error on send message ${err.message}`
    )
  }

  return message
}
