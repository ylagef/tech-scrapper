const { CHATID, LISTENBOT, ALLVENDORS, BOTTOKEN } = process.env

const TelegramBot = require('node-telegram-bot-api')
const logger = require('node-color-log')
const { addRow, getLastScrap } = require('../db/utils.js')
const md5 = require('md5-nodejs')
const { vendorsObj } = require('../vendors/vendorsObj')

const bot = new TelegramBot(BOTTOKEN, { polling: LISTENBOT === '1' })
exports.bot = bot

if (LISTENBOT === '1') {
  bot.on('polling_error', async (error) => {
    logger.bgColor('red').color('black').log(error)
    await bot.sendMessage(CHATID, `Err on polling ${error.message}`)
  })

  bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data

    if (action.startsWith('new_')) {
      try {
        const newItem = { active: true }

        const vendor = action.split('_')[1]
        const nameMessage = await bot.sendMessage(CHATID, 'Article name?', { reply_markup: { force_reply: true, input_field_placeholder: 'Name of the article' } })
        console.log(`MESSAGE ID ${nameMessage.message_id}`)

        bot.onReplyToMessage(CHATID, nameMessage.message_id, async (msg) => {
          const name = msg.text
          newItem.name = name

          const urlMessage = await bot.sendMessage(CHATID, `${name}'s url?`, { reply_markup: { force_reply: true, input_field_placeholder: 'Url of the article' } })

          bot.onReplyToMessage(CHATID, urlMessage.message_id, async (msg) => {
            const url = msg.text

            newItem.url = url
            newItem.vendor = vendor
            newItem.key = md5(`${vendor}${name}${url}`)
            newItem.date = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`

            await addRow(bot, newItem)

            logger.bgColor('green').color('black').log(` ${name} was added! 💪🏼 `)
            await bot.sendMessage(CHATID, `${name} was added!`)
          })
        })
      } catch (err) {
        logger.bgColor('red').color('black').log('Error on add new', err.message)
        await bot.sendMessage(CHATID, 'Error on add new')
      }
    }
  })

  bot.onText(/\/lastscrap/, async () => {
    try {
      const last = await getLastScrap(bot)
      await bot.sendMessage(CHATID, `<b>PC</b> · ${last.pc}\n<b>Clouding</b> · ${last.clouding}`, { parse_mode: 'HTML' })
    } catch (err) {
      logger.bgColor('red').color('black').log('Error on get last scrap', err.message)
      await bot.sendMessage(CHATID, 'Error on get last scrap')
    }
  })
  bot.onText(/\/new/, async () => {
    try {
      const vendors = ALLVENDORS.split(',').sort().map(vendor =>
        ({
          text: vendorsObj.find(vendorObj =>
            vendorObj.key === vendor
          )?.name,
          callback_data: `new_${vendor}`
        })
      )

      const keyboard = []
      for (let i = 0; i < vendors.length; i++) {
        const index = Math.floor(i / 2)

        if (!keyboard[index]) keyboard[index] = []
        keyboard[index].push(vendors[i])
      }

      const opts = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }

      await bot.sendMessage(CHATID, 'Select the vendor', opts)
    } catch (err) {
      logger.bgColor('red').color('black').log('Error on add new (select vendor)', err.message)
      await bot.sendMessage(CHATID, 'Error on add new (select vendor)')
    }
  })
}
