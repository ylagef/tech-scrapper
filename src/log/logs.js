const logger = require('node-color-log')

exports.logs = {
  log: (msg) => logger.log(`${msg}`),
  dim: (msg) => logger.dim().log(`${msg}`),
  bold: (msg) => logger.bold().log(`${msg}`),
  info: (msg) => logger.color('black').bgColor('cyan').log(` ${msg} `),
  error: (msg) => logger.color('black').bgColor('red').log(` ${msg} `),
  success: (msg) => logger.color('black').bgColor('green').log(` ${msg} `)
}
