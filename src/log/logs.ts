import logger from 'node-color-log'

let lastLogs = ''

export const clearLogs = () => {
  lastLogs = ''
}
export const getLastLogs = () => lastLogs

export const logs = {
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
  info: (msg) => logger.color('black').bgColor('cyan').log(` ${msg} `),
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
