const { LISTENBOT, BOTTOKEN } = process.env

const TelegramBot = require('node-telegram-bot-api')

const bot = new TelegramBot(BOTTOKEN, { polling: LISTENBOT === '1', request: { family: 4 } })
exports.bot = bot
