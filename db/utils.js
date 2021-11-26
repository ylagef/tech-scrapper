const { SERVERID, CHATID } = process.env

const logger = require('node-color-log')
const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../client_secret.json')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async (bot) => {
  try {
    await doc.useServiceAccountAuth(creds)
    await doc.loadInfo()
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on initialize db', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on initialize db (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.getArticlesFromDb = async (bot) => {
  logger.dim().log('\nReading DB...')
  const articles = []

  try {
    const sheet = doc.sheetsByTitle.products
    const rows = await sheet.getRows()
    rows.forEach(row => {
      articles.push({
        date: row._rawData[0],
        key: row._rawData[1],
        vendor: row._rawData[2],
        name: row._rawData[3],
        price: row._rawData[4],
        active: row._rawData[5],
        url: row._rawData[6],
        cells: row.a1Range.split('!')[1]
      })
    })

    logger.dim().log('Read DB ok')
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on DB read', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on DB read (${err.message})`, { parse_mode: 'HTML' })
  }

  return articles
}

exports.addRow = async (bot, { key, date, vendor, name, price, active, url }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    const row = await sheet.addRow([date, key, vendor, name, price, active, url])
    return row.a1Range.split('!')[1]
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on add row', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on add row (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.updateCells = async (bot, article) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(article.cells)

    const dateCell = sheet.getCellByA1(article.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + article.cells.split(':')[1].slice(1))

    dateCell.value = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
    priceCell.value = article.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update cells', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on update cells (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.updateLastScrap = async (bot) => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:B3')

    const cellA1 = SERVERID === 'PC' ? 'B2' : 'B3'
    const dateCell = sheet.getCellByA1(cellA1)

    dateCell.value = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
    await sheet.saveCells([dateCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update last scrap', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on update last scrap (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.getLastScrap = async (bot) => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:B3')

    const pc = sheet.getCellByA1('B2').value || 'NONE'
    const clouding = sheet.getCellByA1('B3').value || 'NONE'

    return { pc, clouding }
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on get last scrap', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on get last scrap (${err.message})`, { parse_mode: 'HTML' })
  }
}
