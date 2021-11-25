const logger = require('node-color-log')
const vendorsData = require('./vendorsData.json')

exports.vendorsObj = [
  {
    key: 'carrefour',
    name: 'Carrefour',
    items: vendorsData.carrefour.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      // if (await checkCaptcha(page, '.a-box.a-color-offset-background', true)) return 'CAPTCHA' // Check if captcha

      const stock = (await page.$$('.add-to-cart-button__full-button.add-to-cart-button__button')).length > 0
      return stock ? ((await page.textContent('.buybox__price--current'))?.replaceAll('.', '').replaceAll(' ', '')) : 'NO STOCK'
    }
  },
  {
    key: 'carrefourquery',
    name: 'Carrefour query',
    items: vendorsData.carrefourquery.items,
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      await page.waitForSelector('.ebx-result-figure__img')
      const items = (await page.$$('article.ebx-result.ebx-result--normal')).length
      const stock = (await page.$$('.ebx-result-add2cart__full-button.ebx-result-add2cart__button')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'amazon',
    name: 'Amazon',
    items: vendorsData.amazon.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.a-box.a-color-offset-background', true)) return 'CAPTCHA' // Check if captcha
      await page.$$eval('[data-action="sp-cc"]', nodes => nodes.forEach(node => { node.style.display = 'none' }))
      const stock = (await page.$$('.a-price.a-text-price.a-size-medium')).length > 0
      return stock ? ((await page.textContent('.a-price.a-text-price.a-size-medium'))?.replaceAll('.', '').split('€')[0] + '€') : 'NO STOCK'
    }
  },
  {
    key: 'ardistelquery',
    name: 'Ardistel query',
    items: vendorsData.ardistelquery.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-image-wrapper')).length
      const stock = (await page.$$('.product-image-wrapper  .fas.fa-shopping-cart.fa-fw')).length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'xtralife',
    name: 'Xtralife',
    items: vendorsData.xtralife.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.view-smallGridElement')).length
      const buttons = await page.$$eval('.cursorPointer.fontBold.fontNormal.h-40.primaryButtonYellowXl', nodes => nodes.map(node => node.innerText))
      const stock = buttons.filter(button => button.includes('Añadir a cesta')).length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'fnac',
    name: 'Fnac',
    items: vendorsData.fnac.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.f-priceBox-price')).length > 0
      return stock ? (await page.textContent('.f-priceBox-price')).replaceAll('.', '').replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'worten',
    name: 'Worten',
    items: vendorsData.worten.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.iss-product-availability')).length > 0
      return stock ? await page.textContent('.iss-product-current-price') : 'NO STOCK'
    }
  },
  {

    key: 'wivai',
    name: 'Wivai',
    items: vendorsData.wivai.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-tile')).length
      return `${items} products`
    }
  },
  {
    key: 'mediamarkt',
    name: 'Mediamarkt',
    items: vendorsData.mediamarkt.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const price = (await page.textContent('[font-family="price"]'))?.split('.')[0] + '€'
      const stock = (await page.$$('#pdp-add-to-cart-button')).length > 0 ? '' : '(NO STOCK)'

      return `${price} ${stock}`
    }
  },
  {
    key: 'mediamarktQuery',
    name: 'Mediamarkt query',
    items: vendorsData.mediamarktQuery.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('[data-test="mms-search-srp-productlist-item"]')).length
      const delivery = (await page.$$('[data-test="mms-delivery-online-availability_AVAILABLE"]')).length
      const inShop = (await page.$$('[data-test="mms-delivery-market-availability_AVAILABLE"]')).length

      return `${items} products (${delivery} delivery - ${inShop} in shop)`
    }
  },
  {
    key: 'elcorteingles',
    name: 'El corte inglés',
    items: vendorsData.elcorteingles.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.product_detail-main-container', false)) return 'CAPTCHA' // Check if captcha

      const stock = (await page.$$('.price._big')).length > 0
      return stock ? (await page.textContent('.price._big'))?.replaceAll('.', '').replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'elcorteinglesquery',
    name: 'El corte inglés query',
    items: vendorsData.elcorteinglesquery.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.plp_title_h1', false)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('.products_list-item')).length
      const prices = await page.$$eval('.price._big', nodes => nodes.map(node => node.innerText))
      const stock = prices.filter(price => price !== '').length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'pcccomponentes',
    name: 'PcComponentes',
    items: vendorsData.pccomponentes.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '#cf-wrapper', true)) return 'CAPTCHA' // Check if captcha

      const hasPrice = (await page.$$('#precio-main')).length > 0
      const price = hasPrice ? (await page.textContent('#precio-main')) : ''
      const stock = (await page.$$('#btnsWishAddBuy > .buy-button')).length > 0 ? '' : '(NO STOCK)'
      return hasPrice ? `${price} ${stock}` : 'NO STOCK'
    }
  },
  {
    key: 'pccomponentesquery',
    name: 'PcComponentes query',
    items: vendorsData.pccomponentesquery.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '#cf-wrapper', true)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('article')).length
      const availabilities = await page.$$eval('.c-product-card__availability', nodes => nodes.map(node => node.innerText))
      const stock = availabilities.filter(availability => availability.includes('Recíbelo')).length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'mielectro',
    name: 'Mielectro',
    items: vendorsData.mielectro.items,
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))
      return price[3] ? price[3]?.replaceAll('.', '') : 'NO STOCK'
    }
  },

  {
    key: 'game',
    name: 'Game',
    items: vendorsData.game.items,
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.buy-xl.buy-new > .buy--price')).length > 0
      return stock ? (await page.textContent('.buy-xl.buy-new > .buy--price'))?.trim().replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'gamequery',
    name: 'Game query',
    items: vendorsData.gamequery.items,
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      await page.waitForSelector('img.img-responsive')

      const items = (await page.$$('.item-info')).length
      const stock = (await page.$$eval('.buy--type', nodes => nodes.map(node => node.innerText))).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'sonyexperience',
    name: 'Sonyexperience',
    items: vendorsData.sonyexperience.items,
    jsEnabled: false,
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
