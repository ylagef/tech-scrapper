const { logs } = require('../log/logs')

exports.vendorsObj = [
  {
    key: 'carrefour',
    name: 'Carrefour',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.add-to-cart-button__full-button.add-to-cart-button__button')).length > 0
      return stock ? ((await page.textContent('.buybox__price--current'))?.replaceAll('.', '').replaceAll(' ', '')) : 'NO STOCK'
    }
  },
  {
    key: 'carrefourquery',
    name: 'Carrefour query',
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
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.a-box.a-color-offset-background', true)) return 'CAPTCHA' // Check if captcha
      await page.$$eval('[data-action="sp-cc"]', nodes => nodes.forEach(node => { node.style.display = 'none' }))
      const stock = (await page.$$('.a-price.a-text-price.a-size-medium')).length > 0
      return stock ? ((await page.textContent('.a-price.a-text-price.a-size-medium'))?.replaceAll('.', '').split('€')[0] + '€') : 'NO STOCK'
    }
  },
  {
    key: 'ardistel',
    name: 'Ardistel',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const price = ((await page.textContent("[style='font-size:28px;color:#EC7306;']"))?.replaceAll(' ', ''))
      const stock = (await page.$$('#sistock')).length > 0 ? '' : '(NO STOCK)'

      return `${price} ${stock}`
    }
  },
  {
    key: 'ardistelquery',
    name: 'Ardistel query',
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
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      await page.waitForSelector('a > img')

      const items = (await page.$$('.view-smallGridElement')).length
      const buttons = await page.$$eval('.cursorPointer.fontBold.fontNormal.h-40.primaryButtonYellowXl', nodes => nodes.map(node => node.innerText))
      const stock = buttons.filter(button => button.includes('Añadir a cesta')).length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'fnac',
    name: 'Fnac',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.f-productVisuals__mainMedia.js-ProductVisuals-imagePreview', false)) return 'CAPTCHA' // Check if captcha
      const stock = (await page.$$('.f-priceBox-price')).length > 0
      return stock ? (await page.textContent('.f-priceBox-price')).replaceAll('.', '').replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'fnacquery',
    name: 'Fnac query',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.Article-itemVisualImg', false)) return 'CAPTCHA' // Check if captcha
      const items = (await page.$$('article.Article-itemGroup')).length
      const stock = (await page.$$('article.Article-itemGroup  .js-ProductBuy-add')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'worten',
    name: 'Worten',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.iss-product-availability')).length > 0
      return stock ? await page.textContent('.iss-product-current-price') : 'NO STOCK'
    }
  },
  {
    key: 'wortenquery',
    name: 'Worten query',
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      await page.waitForSelector('figure > img')
      const items = (await page.$$('.w-product__wrapper')).length
      return `${items} products`
    }
  },
  {

    key: 'wivai',
    name: 'Wivai',
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-tile')).length
      return `${items} products`
    }
  },
  {
    key: 'mediamarkt',
    name: 'Mediamarkt',
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
    key: 'pccomponentes',
    name: 'PcComponentes',
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
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))
      return price[3] ? price[3]?.replaceAll('.', '') : 'NO STOCK'
    }
  },

  {
    key: 'game',
    name: 'Game',
    jsEnabled: true,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.buy-xl.buy-new > .buy--price')).length > 0
      return stock ? (await page.textContent('.buy-xl.buy-new > .buy--price'))?.trim().replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'gamequery',
    name: 'Game query',
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
    jsEnabled: false,
    checkPrice: async ({ page }) => {
      return (await page.textContent('.current-price > span'))?.replace('.', '').replace(/\s/g, '')
    }
  }
]

const checkCaptcha = async (page, element, has) => {
  const captcha = (await page.$$(element)).length

  if (has ? captcha > 0 : captcha === 0) {
    logs.error('Captcha detected! ☠️')
    return true
  }

  return false
}
