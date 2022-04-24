const { LISTENBOT, BOTTOKEN } = process.env

import TelegramBot from 'node-telegram-bot-api'

export const bot: TelegramBot = new TelegramBot(BOTTOKEN, {
  polling: LISTENBOT === '1'
  // request: { family: 4 }
})
