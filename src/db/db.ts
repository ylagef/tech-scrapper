const { SERVERID, CHATID, PRIVATEKEY, CLIENTEMAIL } = process.env

import { GoogleSpreadsheet } from 'google-spreadsheet'
import md5 from 'md5-nodejs'
import { logs } from '../log/logs.js'
import { bot } from '../telegram/bot.js'
import { getDateTimeString, getTimeString } from '../utils.js'

const doc = new GoogleSpreadsheet(
  '11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps'
)

export interface Item {
  date: string
  key: string
  vendor: string
  name: string
  price: string
  active: boolean
  url: string
  cells: string
}

export const initializeDb = async () => {
  try {
    logs.dim('\nInitialize DB...')
    await doc.useServiceAccountAuth({
      client_email: CLIENTEMAIL,
      private_key: PRIVATEKEY
    })
    await doc.loadInfo()
    logs.dim('Initialize DB ok')
  } catch (err) {
    logs.error(`Error on initialize DB ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on initialize DB (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

const addNewServer = async ({ sheet, servers, server }) => {
  try {
    await sheet.setHeaderRow(['Vendors', ...servers, server])

    const rows = await sheet.getRows()

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

export const getVendorsFromDB = async () => {
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

    const rows = await sheet.getRows()
    const rowsData = rows.map((row) => row._rawData)
    servers.forEach((server, index) => {
      if (!vendors[server]) vendors[server] = {}
      rowsData.forEach((row) => {
        vendors[server][row[0]] = row[index + 1] === 'TRUE'
      })
    })

    const activeVendors =
      Object.fromEntries(
        Object.entries(vendors[SERVERID]).filter(([_, value]) => value)
      ) || {}
    logs.dim('Get vendors ok')

    return { allVendors: vendors, activeVendors }
  } catch (err) {
    logs.error(`Error on get vendors ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on get vendors (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const getItemsFromDb = async () => {
  logs.dim('\nGetting items...')
  const items: Item[] = []

  try {
    const sheet = doc.sheetsByTitle.products
    const rows = await sheet.getRows()
    rows.forEach((row) => {
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

    logs.dim('Get items ok')
  } catch (err) {
    logs.error(`Error on getting items ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on getting items (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }

  return items
}

export const addItemRow = async ({
  key,
  date,
  vendor,
  name,
  price,
  active,
  url
}) => {
  try {
    const sheet = doc.sheetsByTitle.products
    const row = await sheet.addRow([
      date,
      key,
      vendor,
      name,
      price,
      active,
      url
    ])
    return row.a1Range.split('!')[1]
  } catch (err) {
    logs.error(`Error on add item row ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on add item row (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const addHistoryRow = async ({ key, date, vendor, name, price }) => {
  try {
    const sheet = doc.sheetsByTitle.history
    await sheet.addRow([key, date, vendor, name, price])
  } catch (err) {
    logs.error(`Error on add history row ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on add history row (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const updatePrice = async (item) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + item.cells.split(':')[1].slice(1))

    dateCell.value = `${new Date().toDateString()} ${getTimeString()}`
    priceCell.value = item.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    logs.error(`Error on update cells ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update cells (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const disableItem = async (item, price = false) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + item.cells.split(':')[1].slice(1))
    const activeCell = sheet.getCellByA1(
      'F' + item.cells.split(':')[1].slice(1)
    )

    dateCell.value = `${new Date().toDateString()} ${getTimeString()}`
    if (price) priceCell.value = item.price
    activeCell.value = 'FALSE'
    await sheet.saveCells(
      price ? [dateCell, priceCell, activeCell] : [dateCell, activeCell]
    )
    logs.info(`Item ${item.name} disabled`)
  } catch (err) {
    logs.error(`Error on update cells ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update cells (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const updateKey = async ({ bot, item, vendor }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(item.cells)

    const dateCell = sheet.getCellByA1(item.cells.split(':')[0])
    const keyCell = sheet.getCellByA1('B' + item.cells.split(':')[1].slice(1))

    dateCell.value = `${new Date().toDateString()} ${getTimeString()}`
    keyCell.value = md5(`${vendor.key}${item.name}${item.url}`)
    await sheet.saveCells([dateCell, keyCell])
  } catch (err) {
    logs.error(`Error on update cells ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update cells (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const updateLastScrap = async ({ bot, endDate, minutesSeconds }) => {
  try {
    await doc.sheetsByTitle.vendors.loadHeaderRow()
    const servers = doc.sheetsByTitle.vendors.headerValues.slice(1)
    const rowIndex = servers.indexOf(SERVERID) + 2

    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells(`A${rowIndex}:C${rowIndex}`)

    const serverA1 = `A${rowIndex}`
    const dateA1 = `B${rowIndex}`
    const ellapsedA1 = `C${rowIndex}`

    const serverCell = sheet.getCellByA1(serverA1)
    const dateCell = sheet.getCellByA1(dateA1)
    const ellapsedCell = sheet.getCellByA1(ellapsedA1)

    serverCell.value = `${SERVERID}`
    dateCell.value = `${getDateTimeString(endDate)}`
    ellapsedCell.value = minutesSeconds
    await sheet.saveCells([serverCell, dateCell, ellapsedCell])
  } catch (err) {
    logs.error(`Error on update last scrap ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update last scrap (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const getLastScrap = async () => {
  try {
    const sheet = doc.sheetsByTitle.stats
    const rows = await sheet.getRows()

    const message = []
    rows.forEach((row) => {
      message.push(
        `<b>${row._rawData[0]}</b> · ${row._rawData[1]} - ${row._rawData[2]}`
      )
    })

    return message.join('\n')
  } catch (err) {
    logs.error(`Error on get last scrap ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on get last scrap (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}

export const updateVendor = async ({ bot, state, vendor }) => {
  try {
    await doc.sheetsByTitle.vendors.loadHeaderRow()
    const servers = doc.sheetsByTitle.vendors.headerValues.slice(1)
    const rowIndex = servers.indexOf(SERVERID) + 1

    const sheet = doc.sheetsByTitle.vendors
    const rows = await sheet.getRows()

    const cellsA1 = rows.find((row) => row._rawData[0] === vendor).a1Range
    await sheet.loadCells(cellsA1.split('!')[1])

    const colIndex = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z'
    ][rowIndex]
    const cellA1 = colIndex + cellsA1.split('!')[1].split(':')[0].slice(1)
    const cell = sheet.getCellByA1(cellA1)

    cell.value = state === 'enable'
    await sheet.saveCells([cell])
  } catch (err) {
    logs.error(`Error on update last scrap ${err.message}`)
    await bot.sendMessage(
      CHATID,
      `<b>(${SERVERID})</b> · Error on update last scrap (${err.message})`,
      { parse_mode: 'HTML' }
    )
  }
}
