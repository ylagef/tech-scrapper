const { LISTEN_BOT, BOT_TOKEN } = process.env

import TelegramBot from 'node-telegram-bot-api'

export const bot: TelegramBot = new TelegramBot(BOT_TOKEN, {
  polling: LISTEN_BOT === '1'
  // request: { family: 4 }
})
