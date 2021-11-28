const { CHATID, LISTENBOT, BOTTOKEN } = process.env

const TelegramBot = require('node-telegram-bot-api')
const { addRow, getLastScrap, getVendorsFromDB, getItemsFromDb, updateVendor } = require('../db/db.js')
const md5 = require('md5-nodejs')
const { vendorsObj } = require('../vendors/vendorsObj')
const { getTimeString } = require('../utils.js')
const { logs } = require('../log/logs.js')

const bot = new TelegramBot(BOTTOKEN, { polling: LISTENBOT === '1', request: { family: 4 } })
exports.bot = bot

exports.initializeBotListeners = async () => {
  logs.dim('\nInitializing bot listeners...')

  const listenForUrl = ({ urlMessageId, newItem, vendor, name }) => {
    logs.info(`Listening for url ${urlMessageId}`)

    bot.onReplyToMessage(CHATID, urlMessageId, async (msg) => {
      const url = msg.text

      newItem.url = url
      newItem.vendor = vendor
      newItem.key = md5(`${vendor}${name}${url}`)
      newItem.date = `${(new Date()).toDateString()} ${getTimeString()}`

      await addRow(newItem)

      logs.success(`${name} was added! 💪🏼`)
      await this.message({ msg: `${name} was added!` })
    })
  }

  const listenForName = ({ nameMessageId, newItem, vendor }) => {
    logs.info(`Listening for name ${nameMessageId}`)

    bot.onReplyToMessage(CHATID, nameMessageId, async (msg) => { // TODO here!
      const name = msg.text
      newItem.name = name
      logs.info(`NAME ${name}`)
      const urlMessage = await this.message({
        msg: `${name}'s url?`,
        opts: {
          reply_markup:
          {
            force_reply: true,
            input_field_placeholder: 'Url of the item'
          }

        }
      })

      listenForUrl({ urlMessageId: urlMessage.message_id, newItem, vendor, name })
    })
  }

  const handleNew = async ({ action }) => {
    try {
      const newItem = { active: true }

      const vendor = action.split('_')[1]
      logs.info(`Selected ${vendor}`)
      const nameMessage = await this.message({
        msg: 'Item name?',
        opts: {
          reply_markup:
          {
            force_reply: true,
            input_field_placeholder: 'Name of the item'
          }
        }
      })

      listenForName({ nameMessageId: nameMessage.message_id, newItem, vendor })
    } catch (err) {
      logs.error('Error on add new', err.message)
      await this.message({ msg: 'Error on add new' })
    }
  }

  const handlePrices = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[1]

      logs.info(`Selected ${selectedVendor}`)

      const items = await getItemsFromDb()
      const vendors = (await getVendorsFromDB())
        .allVendors
        .filter(vendor => selectedVendor !== 'all' ? vendor.key === selectedVendor : true)

      const message = vendors.map(vendor => {
        let vendorMessage = `<b>${vendorsObj.find(vendorObj => vendorObj.key === vendor.key).name}</b>\n`
        vendorMessage += items
          .sort((a, b) => a.key < b.key ? -1 : (a.vendor > b.vendor ? 1 : 0))
          .filter(item => item.vendor === vendor.key)
          .map(item => `         ${item.name} · <a href="${item.url}">${item.price}</a>`)
          .join('\n')
        return vendorMessage
      }).join('\n\n')

      await this.message({ msg: message, html: true, disablePreview: true })
    } catch (err) {
      logs.error('Error on add new', err.message)
      await this.message({ msg: 'Error on add new' })
    }
  }

  const handleUpdateVendor = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[2]

      logs.info(`Selected ${selectedVendor}`)

      const keyboard = [
        [{ text: 'Enable', callback_data: `update_vendor_enable_${selectedVendor}` }],
        [{ text: 'Disable', callback_data: `update_vendor_disable_${selectedVendor}` }]
      ]
      const opts = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }

      await this.message({ msg: `What do you want to do with ${selectedVendor}?`, opts })
    } catch (err) {
      logs.error('Error on add new', err.message)
      await this.message({ msg: 'Error on add new' })
    }
  }

  const handleUpdateVendorEnableDisable = async ({ action }) => {
    try {
      const state = action.split('_')[2]
      const vendor = action.split('_')[3]

      logs.info(`Selected ${state}`)

      await updateVendor({ bot, state, vendor })
      await this.message({ msg: `${vendor} is now ${state}d` })
    } catch (err) {
      logs.error('Error on add new', err.message)
      await this.message({ msg: 'Error on add new' })
    }
  }

  if (LISTENBOT === '1') {
    bot.on('polling_error', async (error) => {
      logs.error(`Err on polling ${error.message}`)
      await this.message({ msg: `Err on polling ${error.message}` })
    })

    bot.on('webhook_error', async (error) => {
      logs.error(`Err on webhook ${error.message}`)
      await this.message({ msg: `Err on webhook ${error.message}` })
    })

    bot.on('callback_query', async (callbackQuery) => {
      const action = callbackQuery.data

      if (action.startsWith('new_')) {
        await handleNew({ action })
      } else if (action.startsWith('prices_')) {
        await handlePrices({ action })
      } else if (action.startsWith('update_vendor_enable') || action.startsWith('update_vendor_disable')) {
        await handleUpdateVendorEnableDisable({ action })
      } else if (action.startsWith('update_vendor')) {
        await handleUpdateVendor({ action })
      }
    })

    bot.onText(/\/restart/, async () => {
      try {
        logs.info('Asked for restart')

        process.exit()
      } catch (err) {
        logs.error('Error on restart', err.message)
        await this.message({ msg: 'Error on restart' })
      }
    })

    bot.onText(/\/lastscrap/, async () => {
      try {
        logs.info('Asked for last scrap')

        const last = await getLastScrap()
        await this.message({
          msg: `<b>PC</b> · ${last.pc}\n<b>Clouding</b> · ${last.clouding}`,
          html: true
        })
      } catch (err) {
        logs.error('Error on get last scrap', err.message)
        await this.message({ msg: 'Error on get last scrap' })
      }
    })

    bot.onText(/\/new/, async () => {
      try {
        logs.info('New requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'new', filterActive: true })
          }
        }

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error('Error on add new (select vendor)', err.message)
        await this.message({ msg: 'Error on add new (select vendor)' })
      }
    })

    bot.onText(/\/prices/, async () => {
      try {
        logs.info('Prices requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'prices', allOption: true })
          }
        }

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error('Error on prices (select vendor)', err.message)
        await this.message({ msg: 'Error on prices (select vendor)' })
      }
    })

    bot.onText(/\/updatevendor/, async () => {
      try {
        logs.info('Prices requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'update_vendor' })
          }
        }

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error('Error on prices (select vendor)', err.message)
        await this.message({ msg: 'Error on prices (select vendor)' })
      }
    })
  }
}

const getVendorsKeyboard = async ({ key, filterActive = false, allOption = false }) => {
  const keyboard = []

  try {
    const vendors = (await getVendorsFromDB())[filterActive ? 'activeVendors' : 'allVendors']
    const vendorKeys = vendors
      .map(vendor => vendor.key)
      .sort()
      .map(vendor =>
        ({
          text: vendorsObj
            .find(vendorObj =>
              vendorObj.key === vendor
            )
            ?.name,
          callback_data: `${key}_${vendor}`
        })
      )

    for (let i = 0; i < vendorKeys.length; i++) {
      const index = Math.floor(i / 2)

      if (!keyboard[index]) keyboard[index] = []
      keyboard[index].push(vendorKeys[i])
    }

    if (allOption) {
      keyboard.unshift([{
        text: 'All',
        callback_data: `${key}_all`
      }])
    }
  } catch (err) {
    logs.error('Error on get vendors keyboard', err.message)
  }

  return keyboard
}

exports.message = async ({ msg, html = false, disablePreview = false, opts = {} }) => {
  try {
    if (html) opts.parse_mode = 'HTML'
    opts.disable_web_page_preview = disablePreview

    await bot.sendMessage(CHATID, msg, opts)
  } catch (err) {
    logs.error('Error on send message', err.message)
    await bot.sendMessage(CHATID, `Error on send message ${err.message}`)
  }
}
