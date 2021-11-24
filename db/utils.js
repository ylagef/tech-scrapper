const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../client_secret.json')

const doc = new GoogleSpreadsheet('11yXmT2NEWBRcpvy6_M-_TdDMHidqvHLMs15ctMZxZps')

exports.initializeDb = async () => {
  await doc.useServiceAccountAuth(creds)
  await doc.loadInfo()
}

exports.getArticlesFromDb = async () => {
  console.log('Read DB...')
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

    dateCell.value = (new Date()).getTime()
    priceCell.value = article.price
    await sheet.saveCells([dateCell, priceCell])
  } catch (err) {
    console.error('Error on add row', err)
  }
}
