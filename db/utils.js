const fs = require('fs')

exports.getPricesFromDb = () => {
  let prices = {}

  try {
    prices = JSON.parse(fs.readFileSync('./db/prices.json', 'utf8'))
  } catch (err) {
    console.error('Error on DB read')
  }

  return prices
}

exports.updateDb = (prices) => {
  try {
    fs.writeFileSync('./db/prices.json', JSON.stringify(prices))
  } catch (err) {
    console.error('Error on DB update', err)
  }
}
