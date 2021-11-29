const { SERVERID, CHATID, PRIVATEKEY, CLIENTEMAIL } = process.env

const { GoogleSpreadsheet } = require('google-spreadsheet')
const md5 = require('md5-nodejs')
const { getTimeString } = require('../utils')
const { logs } = require('../log/logs')
const { bot } = require('../telegram/bot')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async () => {
  try {
    logs.dim('\nInitialize DB...')
    await doc.useServiceAccountAuth({ client_email: CLIENTEMAIL, private_key: PRIVATEKEY })
    await doc.loadInfo()
    logs.dim('Initialize DB ok')
  } catch (err) {
    logs.error('Error on initialize DB', err.message)
    await bot.sendMessage(CHATID, `<b>(${SERVERID})</b> · Error on initialize DB (${err.message})`, { parse_mode: 'HTML' })
  }
}

const addNewServer = async ({ sheet, servers, server }) => {
  try {
    await sheet.setHeaderRow(['Vendors', ...servers, server])

    const rows = (await sheet.getRows())

    const startCell = rows[0].a1Range.split('!')[1].split(':')[1]
    const endCell = rows[rows.length - 1].a1Range.split('!')[1].split(':')[1]
    await sheet.loadCells(`${startCell}:${endCell}`)

    for (const row of rows) {
      const cellA1 = row.a1Range.split('!')[1].split(':')[1]
      const cell = sheet.getCellByA1(cellA1)
      cell.value = 'FALSE'
      await sheet.saveCells([cell])
    }
  } catch (err) {
    logs.error(`Error on add new server ${err.message}`)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on add new server (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }
}

exports.getVendorsFromDB = async () => {
  logs.dim('\nGetting vendors...')
  const vendors = {}

  try {
    const sheet = doc.sheetsByTitle.vendors
    await sheet.loadHeaderRow()
    const servers = sheet.headerValues.slice(1)
    if (!servers.includes(SERVERID)) {
      logs.info(`NEW server ${SERVERID} found`)
      await addNewServer({ sheet, servers, server: SERVERID })
      servers.push(SERVERID)
    }

    const rows = (await sheet.getRows())
    const rowsData = rows.map(row => row._rawData)
    servers.forEach((server, index) => {
      if (!vendors[server]) vendors[server] = {}
      rowsData.forEach(row => {
        vendors[server][row[0]] = row[index + 1] === 'TRUE'
      })
    })

    const activeVendors = Object.fromEntries(Object.entries(vendors[SERVERID]).filter(([key, value]) => value)) || {}
    logs.dim('Get vendors ok')

    return { allVendors: vendors, activeVendors }
  } catch (err) {
    logs.error('Error on get vendors', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on get vendors (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }
}

exports.getItemsFromDb = async () => {
  logs.dim('\nReading DB...')
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

    logs.dim('Read DB ok')
  } catch (err) {
    logs.error('Error on DB read', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on DB read (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }

  return items
}

exports.addRow = async ({ key, date, vendor, name, price, active, url }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    const row = await sheet.addRow([date, key, vendor, name, price, active, url])
    return row.a1Range.split('!')[1]
  } catch (err) {
    logs.error('Error on add row', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on add row (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }
}

exports.updatePrice = async (item) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + item.cells.split(':')[1].slice(1))

    dateCell.value = `${(new Date()).toDateString()} ${getTimeString()}`
    priceCell.value = item.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    logs.error('Error on update cells', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on update cells (${err.message})`,
       { parse_mode: 'HTML' }
    )
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
    logs.error('Error on update cells', err.message)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update cells (${err.message})`,
      { parse_mode: 'HTML' }
    )
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
    logs.error('Error on update last scrap', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on update last scrap (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }
}

exports.getLastScrap = async () => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:C3')

    const pc = `${sheet.getCellByA1('B2').value || 'NONE'} (${sheet.getCellByA1('C2').value || 'NONE'})`
    const clouding = `${sheet.getCellByA1('B3').value || 'NONE'} (${sheet.getCellByA1('C3').value || 'NONE'})`

    return { pc, clouding }
  } catch (err) {
    logs.error('Error on get last scrap', err.message)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on get last scrap (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

exports.updateVendor = async ({ bot, state, vendor }) => {
  try {
    const sheet = doc.sheetsByTitle.vendors
    const rows = await sheet.getRows()

    const cellsA1 = rows.find(row => row._rawData[0] === vendor).a1Range
    await sheet.loadCells(cellsA1.split('!')[1])

    const cellA1 = (SERVERID === 'PC' ? 'B' : 'C') + cellsA1.split('!')[1].split(':')[0].slice(1)
    const cell = sheet.getCellByA1(cellA1)

    cell.value = state === 'enable'
    await sheet.saveCells([cell])
  } catch (err) {
    logs.error('Error on update last scrap', err.message)
    await bot.sendMessage(
      CHATID,
       `<b>(${SERVERID})</b> · Error on update last scrap (${err.message})`,
       { parse_mode: 'HTML' }
    )
  }
}
