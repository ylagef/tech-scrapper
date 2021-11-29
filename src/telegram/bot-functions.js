const { CHATID, LISTENBOT, SERVERID } = process.env

const { addRow, getLastScrap, getVendorsFromDB, getItemsFromDb, updateVendor } = require('../db/db.js')
const md5 = require('md5-nodejs')
const { vendorsObj } = require('../vendors/vendors-obj')
const { getTimeString } = require('../utils.js')
const { logs } = require('../log/logs.js')
const { bot } = require('./bot.js')

exports.initializeBotListeners = async () => {
  logs.dim('\nInitializing bot listeners...')

  const listenForUrl = ({ urlMessage, newItem, vendor, name }) => {
    logs.info(`Listening for url ${urlMessage.message_id}`)

    bot.onReplyToMessage(urlMessage.chat.id, urlMessage.message_id, async (msg) => {
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

  const listenForName = async ({ nameMessage, newItem, vendor }) => {
    try {
      logs.info(`Listening for name ${nameMessage.id}`)

      bot.onReplyToMessage(nameMessage.chat.id, nameMessage.message_id, async (msg) => {
        const name = msg.text

        newItem.name = name
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

        listenForUrl({ urlMessage, newItem, vendor, name })
      })
    } catch (err) {
      logs.error(`Error on listen for name ${err.message}`)
      await this.message({ msg: `Error on listen for name ${err.message}` })
    }
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

      listenForName({ nameMessage, newItem, vendor })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
      await this.message({ msg: `Error on add new ${err.message}` })
    }
  }

  const handlePrices = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[1]

      logs.info(`Selected ${selectedVendor}`)

      const items = await getItemsFromDb()
      const vendors = Object.keys((await getVendorsFromDB())
        .allVendors[SERVERID])
        .filter(vendor => selectedVendor !== 'all' ? vendor === selectedVendor : true)

      const message = vendors.map(vendor => {
        let vendorMessage = `<b>${vendorsObj.find(vendorObj => vendorObj.key === vendor).name}</b>\n`
        vendorMessage += items
          .sort((a, b) => a.key < b.key ? -1 : (a.vendor > b.vendor ? 1 : 0))
          .filter(item => item.vendor === vendor)
          .map(item => `         ${item.name} · <a href="${item.url}">${item.price}</a>`)
          .join('\n')
        return vendorMessage
      }).join('\n\n')

      await this.message({ msg: message, html: true, disablePreview: true })
    } catch (err) {
      logs.error(`Error on add new ${err.message}`)
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
      logs.error(`Error on add new ${err.message}`)
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
      logs.error(`Error on add new ${err.message}`)
      await this.message({ msg: 'Error on add new' })
    }
  }

  const handleVendorState = async ({ action }) => {
    try {
      const selectedVendor = action.split('_')[2]
      const all = selectedVendor === 'all'
      logs.info(`Selected ${selectedVendor}`)

      const vendors = (await getVendorsFromDB()).allVendors[SERVERID]

      let message = ''
      if (all) {
        message = Object.entries(vendors).map(([vendor, state]) => `${state ? '🟢' : '🔴'} <b>${vendorsObj.find(v => v.key === vendor).name}</b>`).join('\n')
      } else {
        const state = vendors[selectedVendor]
        message = `${state ? '🟢' : '🔴'} <b>${vendorsObj.find(v => v.key === selectedVendor).name}</b>`
      }

      await this.message({ msg: message, html: true })
    } catch (err) {
      logs.error(`Error on vendor state ${err.message}`)
      await this.message({ msg: 'Error on vendor state' })
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
      } else if (action.startsWith('vendor_state')) {
        await handleVendorState({ action })
      }
    })

    bot.onText(/\/restart/, async () => {
      try {
        logs.info('Asked for restart')

        process.exit()
      } catch (err) {
        logs.error(`Error on restart ${err.message}`)
        await this.message({ msg: 'Error on restart' })
      }
    })

    bot.onText(/\/lastscrap/, async () => {
      try {
        logs.info('Asked for last scrap')

        const msg = await getLastScrap()
        await this.message({
          msg,
          html: true
        })
      } catch (err) {
        logs.error(`Error on get last scrap ${err.message}`)
        await this.message({ msg: 'Error on get last scrap' })
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

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on add new (select vendor) ${err.message}`)
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
        logs.error(`Error on prices (select vendor) ${err.message}`)
        await this.message({ msg: 'Error on prices (select vendor)' })
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

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on update vendor (select vendor) ${err.message}`)
        await this.message({ msg: 'Error on update vendor (select vendor)' })
      }
    })

    bot.onText(/\/vendorstate/, async () => {
      try {
        logs.info('Vendor state requested')

        const opts = {
          reply_markup: {
            inline_keyboard: await getVendorsKeyboard({ key: 'vendor_state', allOption: true })
          }
        }

        await this.message({ msg: 'Select the vendor', opts })
      } catch (err) {
        logs.error(`Error on vendor state (select vendor) ${err.message}`)
        await this.message({ msg: 'Error on vendor state (select vendor)' })
      }
    })
  }
}

const getVendorsKeyboard = async ({ key, filterActive = false, allOption = false }) => {
  const keyboard = []

  try {
    let vendors = (await getVendorsFromDB())[filterActive ? 'activeVendors' : 'allVendors']
    if (!filterActive) vendors = vendors[SERVERID]

    const vendorKeys = Object.keys(vendors)
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
    logs.error(`Error on get vendors keyboard ${err.message}`)
  }

  return keyboard
}

exports.message = async ({ msg, html = false, disablePreview = false, opts = {} }) => {
  let message = null

  try {
    if (html) opts.parse_mode = 'HTML'
    opts.disable_web_page_preview = disablePreview

    message = await bot.sendMessage(CHATID, msg, opts)
  } catch (err) {
    logs.error(`Error on send message ${err.message}`)
    message = await bot.sendMessage(CHATID, `Error on send message ${err.message}`)
  }

  return message
}
