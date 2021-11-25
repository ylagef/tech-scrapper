const logger = require('node-color-log')
const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../client_secret.json')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async () => {
  await doc.useServiceAccountAuth(creds)
  await doc.loadInfo()
}

exports.getArticlesFromDb = async () => {
  logger.dim().log('\nRead DB...')
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
    logger.color('black').bgColor('red').log('Error on DB read')
  }

  return articles
}

exports.addRow = async ({ key, date, vendor, name, price, active, url }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    const row = await sheet.addRow([date, key, vendor, name, price, active, url])
    return row.a1Range.split('!')[1]
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on add row', err.message)
  }
}

exports.updateCells = async (article) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(article.cells)

    const dateCell = sheet.getCellByA1(article.cells.split(':')[0])
    const priceCell = sheet.getCellByA1('E' + article.cells.split(':')[1].slice(1))

    dateCell.value = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
    priceCell.value = article.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on add row', err.message)
  }
}

exports.updateLastScrap = async () => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:B3')

    const cellA1 = process.env.SERVER === 'PC' ? 'B2' : 'B3'
    const dateCell = sheet.getCellByA1(cellA1)

    dateCell.value = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
    await sheet.saveCells([dateCell])
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update last scrap', err.message)
  }
}

exports.getLastScrap = async () => {
  try {
    const sheet = doc.sheetsByTitle.stats
    await sheet.loadCells('A2:B3')

    const pc = sheet.getCellByA1('B2').value || 'NONE'
    const clouding = sheet.getCellByA1('B3').value || 'NONE'

    return { pc, clouding }
  } catch (err) {
    logger.color('black').bgColor('red').log('Error on update last scrap', err.message)
  }
}
