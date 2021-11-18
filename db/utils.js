const fs = require('fs')

exports.getPricesFromDb = () => {
  let prices = {}

  try {
    prices = JSON.parse(fs.readFileSync('./db/prices.json', 'utf8'))
    console.log('DB read')
  } catch (err) {
    console.error('Error on DB read')
  }

  return prices
}

exports.updateDb = (prices) => {
  try {
    fs.writeFileSync('./db/prices.json', JSON.stringify(prices))
    console.log('DB updated')
  } catch (err) {
    console.error('Error on DB update', err)
  }
}
