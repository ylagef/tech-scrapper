const logger = require('node-color-log')

let lastLogs = ''

exports.clearLogs = () => { lastLogs = '' }
exports.getLastLogs = () => lastLogs

exports.logs = {
  log: (msg) => {
    lastLogs += `${msg}\n`
    return logger.log(`${msg}`)
  },
  dim: (msg) => {
    lastLogs += `<i>${msg}</i>\n`
    return logger.dim().log(`${msg}`)
  },
  bold: (msg) => {
    lastLogs += `<b>${msg}</b>\n`
    return logger.bold().log(`${msg}`)
  },
  info: (msg) => {
    lastLogs += `ℹ️ ${msg}\n`
    return logger.color('black').bgColor('cyan').log(` ${msg} `)
  },
  error: (msg) => {
    lastLogs += `🔴 ${msg}\n`
    return logger.color('black').bgColor('red').log(` ${msg} `)
  },
  success: (msg) => {
    lastLogs += `🟢 ${msg}\n`
    return logger.color('black').bgColor('green').log(` ${msg} `)
  },
  debug: (msg) => logger.dim().log(`🐛 ${msg}`)
}
