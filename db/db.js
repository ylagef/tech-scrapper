const { SERVERID, CHATID, PRIVATEKEY, CLIENTEMAIL } = process.env

const logger = require('node-color-log')
const { GoogleSpreadsheet } = require('google-spreadsheet')
const md5 = require('md5-nodejs')
const { getTimeString } = require('../utils')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async (bot) => {
  try {
    await doc.useServiceAccountAuth({ client_email: CLIENTEMAIL, private_key: PRIVATEKEY })
    await doc.loadInfo()
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on initialize db', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on initialize db (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.getVendorsFromDB = async (bot) => {
  logger.dim().log('\nGetting vendors ...')
  const vendors = []

  try {
    const sheet = doc.sheetsByTitle.vendors
    const rows = await sheet.getRows()
    rows.forEach(row => {
      vendors.push({
        key: row._rawData[0],
        pc: row._rawData[1],
        clouding: row._rawData[2]
      })
    })

    const allVendors = vendors
    const activeVendors = vendors.filter(vendor => SERVERID === 'PC' ? vendor.pc === 'TRUE' : vendor.clouding === 'TRUE')

    logger.dim().log('Get vendors ok')
    return { allVendors, activeVendors }
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on get vendors', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on get vendors (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.getItemsFromDb = async (bot) => {
  logger.dim().log('\nReading DB...')
  const items = []

  try {
    const sheet = doc.sheetsByTitle.products
    const rows = await sheet.getRows()
    rows.forEach(row => {
      items.push({
        date: row._rawData[0],
        key: row._rawData[1],
        vendor: row._rawData[2],
        name: row._rawData[3],
        price: row._rawData[4],
        active: row._rawData[5] === 'TRUE',
        url: row._rawData[6],
        cells: row.a1Range.split('!')[1]
      })
    })

    logger.dim().log('Read DB ok')
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on DB read', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on DB read (${err.message})`, { parse_mode: 'HTML' })
  }

  return items
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

exports.updatePrice = async (bot, item) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + item.cells.split(':')[1].slice(1))

    dateCell.value = `${(new Date()).toDateString()} ${getTimeString()}`
    priceCell.value = item.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update cells', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on update cells (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.updateKey = async ({ bot, item, vendor }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const keyCell = sheet.getCellByA1('B' + item.cells.split(':')[1].slice(1))

    dateCell.value = `${(new Date()).toDateString()} ${getTimeString()}`
    keyCell.value = md5(`${vendor.key}${item.name}${item.url}`)
    await sheet.saveCells([dateCell, keyCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update cells', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on update cells (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.updateLastScrap = async ({ bot, endDate, totalSeconds }) => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:C3')

    const dateA1 = SERVERID === 'PC' ? 'B2' : 'B3'
    const ellapsedA1 = SERVERID === 'PC' ? 'C2' : 'C3'
    const dateCell = sheet.getCellByA1(dateA1)
    const ellapsedCell = sheet.getCellByA1(ellapsedA1)

    dateCell.value = `${getTimeString(endDate)}`
    ellapsedCell.value = `${totalSeconds}s`
    await sheet.saveCells([dateCell, ellapsedCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update last scrap', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on update last scrap (${err.message})`, { parse_mode: 'HTML' })
  }
}

exports.getLastScrap = async (bot) => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:C3')

    const pc = `${sheet.getCellByA1('B2').value || 'NONE'} (${sheet.getCellByA1('C2').value || 'NONE'})`
    const clouding = `${sheet.getCellByA1('B3').value || 'NONE'} (${sheet.getCellByA1('C3').value || 'NONE'})`

    return { pc, clouding }
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on get last scrap', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID || 'NONE'})</b> · Error on get last scrap (${err.message})`, { parse_mode: 'HTML' })
  }
}
