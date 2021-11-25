const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../client_secret.json')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async () => {
  await doc.useServiceAccountAuth(creds)
  await doc.loadInfo()
}

exports.getArticlesFromDb = async () => {
  console.log('\nRead DB...')
  const articles = []

  try {
    const sheet = doc.sheetsByTitle.products
    const rows = await sheet.getRows()
    rows.forEach(row => {
      articles.push({
        date: row._rawData[0],
        key: row._rawData[1],
        vendor: row._rawData[2],
        article: row._rawData[3],
        price: row._rawData[4],
        cells: row.a1Range.split('!')[1]
      })
    })

    console.log('Read DB ok')
  } catch (err) {
    console.error('Error on DB read')
  }

  return articles
}

exports.addRow = async ({ key, date, vendor, article, price }) => {
  try {
    const sheet = doc.sheetsByTitle.products
    const row = await sheet.addRow([date, key, vendor, article, price])
    return row.a1Range.split('!')[1]
  } catch (err) {
    console.error('Error on add row', err)
  }
}

exports.updateCells = async (article) => {
  try {
    const sheet = doc.sheetsByTitle.products
    await sheet.loadCells(article.cells)

    const dateCell = sheet.getCellByA1(article.cells.split(':')[0])
    const priceCell = sheet.getCellByA1(article.cells.split(':')[1])

    dateCell.value = `${(new Date()).toDateString()} ${(new Date()).toLocaleTimeString()}`
    priceCell.value = article.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    console.error('Error on add row', err)
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
    console.error('Error on update last scrap', err)
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
    console.error('Error on update last scrap', err)
  }
}
