const logger = require('node-color-log')
const vendorsData = require('./vendorsData.json')

exports.vendorsObj = [
  {
    key: vendorsData.fnac.key,
    name: vendorsData.fnac.name,
    items: vendorsData.fnac.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.f-priceBox-price')).length > 0
      return stock ? (await page.textContent('.f-priceBox-price')).replaceAll('.', '').replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: vendorsData.worten.key,
    name: vendorsData.worten.name,
    items: vendorsData.worten.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.iss-product-availability')).length > 0
      return stock ? await page.textContent('.iss-product-current-price') : 'NO STOCK'
    }
  },
  {

    key: vendorsData.wivai.key,
    name: vendorsData.wivai.name,
    items: vendorsData.wivai.items,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-tile')).length
      return `${items} productos`
    }
  },
  {
    key: vendorsData.mediamarkt.key,
    name: vendorsData.mediamarkt.name,
    items: vendorsData.mediamarkt.items,
    checkPrice: async ({ page }) => {
      const price = (await page.textContent('[font-family="price"]'))?.split('.')[0] + '€'
      const stock = (await page.$$('#pdp-add-to-cart-button')).length > 0 ? '' : '(NO STOCK)'

      return `${price} ${stock}`
    }
  },
  {
    key: vendorsData.mediamarktQuery.key,
    name: vendorsData.mediamarktQuery.name,
    items: vendorsData.mediamarktQuery.items,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('[data-test="mms-search-srp-productlist-item"]')).length
      const delivery = (await page.$$('[data-test="mms-delivery-online-availability_AVAILABLE"]')).length
      const inShop = (await page.$$('[data-test="mms-delivery-market-availability_AVAILABLE"]')).length

      return `${items} productos (${delivery} - ${inShop})`
    }
  },
  {
    key: vendorsData.elcorteingles.key,
    name: vendorsData.elcorteingles.name,
    items: vendorsData.elcorteingles.items,
    checkPrice: async ({ page }) => {
      // await page.waitForTimeout(10000)
      if (await checkCaptcha(page, '.product_detail-main-container', false)) return 'CAPTCHA' // Check if captcha

      const stock = (await page.$$('.price._big')).length > 0
      return stock ? (await page.textContent('.price._big'))?.replaceAll('.', '').replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: vendorsData.elcorteinglesquery.key,
    name: vendorsData.elcorteinglesquery.name,
    items: vendorsData.elcorteinglesquery.items,
    checkPrice: async ({ page }) => {
      // await page.waitForTimeout(10000)
      if (await checkCaptcha(page, '.plp_title_h1', false)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('products_list-item')).length
      const prices = await page.$$eval('.price._big', nodes => nodes.map(node => node.innerText))
      const stock = prices.find(price => price !== '')
      return `${items} productos (${stock} stock)`
    }
  },
  {
    key: vendorsData.pcccomponentes.key,
    name: vendorsData.pcccomponentes.name,
    items: vendorsData.pcccomponentes.items,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '#cf-wrapper', true)) return 'CAPTCHA' // Check if captcha

      const hasPrice = (await page.$$('#precio-main')).length > 0
      const price = hasPrice ? (await page.textContent('#precio-main')) : ''
      const stock = (await page.$$('#btnsWishAddBuy > .buy-button')).length > 0 ? '' : '(NO STOCK)'
      return hasPrice ? `${price} ${stock}` : 'NO STOCK'
    }
  },
  {
    key: vendorsData.mielectro.key,
    name: vendorsData.mielectro.name,
    items: vendorsData.mielectro.items,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))
      return price[3] ? price[3]?.replaceAll('.', '') : 'NO STOCK'
    }
  },
  {
    key: vendorsData.amazon.key,
    name: vendorsData.amazon.name,
    items: vendorsData.amazon.items,
    checkPrice: async ({ page }) => {
      // [data-action="sp-cc"]
      await page.$$eval('[data-action="sp-cc"]', nodes => nodes.forEach(node => { node.style.display = 'none' }))
      const stock = (await page.$$('.a-price.a-text-price.a-size-medium')).length > 0
      return stock ? ((await page.textContent('.a-price.a-text-price.a-size-medium'))?.replaceAll('.', '').split('€')[0] + '€') : 'NO STOCK'
    }
  },
  {
    key: vendorsData.game.key,
    name: vendorsData.game.name,
    items: vendorsData.game.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.buy-xl.buy-new > .buy--price')).length > 0
      return stock ? (await page.textContent('.buy-xl.buy-new > .buy--price'))?.trim().replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: vendorsData.sonyexperience.key,
    name: vendorsData.sonyexperience.name,
    items: vendorsData.sonyexperience.items,
    checkPrice: async ({ page }) => {
      return (await page.textContent('.current-price > span'))?.replace('.', '').replace(/\s/g, '')
    }
  }
]

const checkCaptcha = async (page, element, has) => {
  const captcha = (await page.$$(element)).length

  if (has ? captcha > 0 : captcha === 0) {
    logger.bgColor('red').color('black').log('\t\t\tCaptcha detected! ☠️\t')
    return true
  }

  return false
}
