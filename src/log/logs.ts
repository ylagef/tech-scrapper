import logger from 'node-color-log'

let lastLogs = ''

export const clearLogs = () => {
  lastLogs = ''
}
export const getLastLogs = () => lastLogs

export const logs = {
  log: (msg: string) => {
    lastLogs += `${msg}\n`
    return logger.log(`${msg}`)
  },
  dim: (msg: string) => {
    lastLogs += `<i>${msg}</i>\n`
    return logger.dim().log(`${msg}`)
  },
  bold: (msg: string) => {
    lastLogs += `<b>${msg}</b>\n`
    return logger.bold().log(`${msg}`)
  },
  info: (msg: string) => logger.color('black').bgColor('cyan').log(` ${msg} `),
  error: (msg: string) => {
    lastLogs += `🔴 ${msg}\n`
    return logger.color('black').bgColor('red').log(` ${msg} `)
  },
  success: (msg: string) => {
    lastLogs += `🟢 ${msg}\n`
    return logger.color('black').bgColor('green').log(` ${msg} `)
  },
  debug: (msg: string) => logger.dim().log(`🐛 ${msg}`)
}
