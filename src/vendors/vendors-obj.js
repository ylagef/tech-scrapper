const { logs } = require('../log/logs')

exports.vendorsObj = [
  {
    key: 'amazon',
    name: 'Amazon',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.a-box.a-color-offset-background', true)) return 'CAPTCHA' // Check if captcha
      await page.$$eval('[data-action="sp-cc"]', nodes => nodes.forEach(node => { node.style.display = 'none' }))

      const outOfStock = (await page.$$('#outOfStock')).length > 0
      const stockOthers = (await page.$$('#buybox-see-all-buying-choices')).length > 0

      const ourPrice = (await page.$$('#priceblock_ourprice')).length > 0 ? (await page.textContent('#priceblock_ourprice'))?.replace(/\s/g, '').replaceAll('.', '') : null
      const price = (await page.$$('.a-price.a-text-price > .a-offscreen')).length > 0 ? (await page.textContent('.a-price.a-text-price > .a-offscreen'))?.replace(/\s/g, '').replaceAll('.', '') : null

      return stockOthers
        ? 'STOCK OTHERS'
        : outOfStock
          ? 'NO STOCK'
          : price || ourPrice
    }
  },
  {
    key: 'ardistel',
    name: 'Ardistel',
    jsEnabled: false,
    auth: false,
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
    auth: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-image-wrapper')).length
      const stock = (await page.$$('.product-image-wrapper  .fas.fa-shopping-cart.fa-fw')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'carrefour',
    name: 'Carrefour',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.add-to-cart-button__full-button.add-to-cart-button__button')).length > 0

      return stock
        ? ((await page.textContent('.buybox__prices > span'))?.replaceAll('.', '').replaceAll(' ', '').trim())
        : 'NO STOCK'
    }
  },
  {
    key: 'carrefourquery',
    name: 'Carrefour query',
    jsEnabled: true,
    auth: false,
    checkPrice: async ({ page }) => {
      const found = await searchItem(page, '.ebx-result-figure__img')
      if (!found) return 'NOT FOUND 😵'

      const items = (await page.$$('article.ebx-result.ebx-result--normal')).length
      const stock = (await page.$$('.ebx-result-add2cart__full-button.ebx-result-add2cart__button')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'elcorteingles',
    name: 'El corte inglés',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.product_detail-main-container', false)) return 'CAPTCHA' // Check if captcha

      const stock = (await page.$$('.price._big')).length > 0

      return stock
        ? (await page.textContent('.price._big'))?.replaceAll('.', '').replace(/\s/g, '')
        : 'NO STOCK'
    }
  },
  {
    key: 'elcorteinglesquery',
    name: 'El corte inglés query',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.plp_title_h1', false)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('.products_list-item')).length
      const prices = await page.$$eval('.price._big', nodes => nodes.map(node => node.innerText))
      const stock = prices.filter(price => price !== '').length
      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'fnac',
    name: 'Fnac',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.f-productVisuals__mainMedia.js-ProductVisuals-imagePreview', false)) return 'CAPTCHA' // Check if captcha

      const stock = (await page.$$('.f-priceBox-price')).length > 0

      return stock
        ? (await page.textContent('.f-priceBox-price')).replaceAll('.', '').replace(/\s/g, '')
        : 'NO STOCK'
    }
  },
  {
    key: 'fnacquery',
    name: 'Fnac query',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '.Article-itemVisualImg', false)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('article.Article-itemGroup')).length
      const stock = (await page.$$('article.Article-itemGroup  .js-ProductBuy-add')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'game',
    name: 'Game',
    jsEnabled: true,
    auth: false,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.buy-xl.buy-new > .buy--price')).length > 0

      return stock ? (await page.textContent('.buy-xl.buy-new > .buy--price'))?.trim().replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'gamequery',
    name: 'Game query',
    jsEnabled: true,
    auth: false,
    checkPrice: async ({ page }) => {
      const found = await searchItem(page, 'img.img-responsive')
      if (!found) return 'NOT FOUND 😵'

      const items = (await page.$$('.item-info')).length
      const stock = (await page.$$eval('.buy--type', nodes => nodes.map(node => node.innerText))).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'mediamarkt',
    name: 'Mediamarkt',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const price = (await page.textContent('[font-family="price"]'))?.split('.')[0] + '€'
      const stock = (await page.$$('#pdp-add-to-cart-button')).length > 0 ? '' : '(NO STOCK)'

      return `${price} ${stock}`
    }
  },
  {
    key: 'mediamarktcart',
    name: 'Mediamarkt cart',
    jsEnabled: true,
    auth: true,
    checkPrice: async ({ page }) => {
      const found = await searchItem(page, '.StyledPicture-sc-1s3zfhk-0.jRuVsy img')
      if (!found) return 'NOT FOUND 😵'

      const available = (await page.$$('[data-test="checkout-continue-desktop-disabled"]')).length > 0 ? 'NO AVAILABLE' : 'AVAILABLE'

      return `${available}`
    }
  },
  {
    key: 'mediamarktquery',
    name: 'Mediamarkt query',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('[data-test="mms-search-srp-productlist-item"]')).length
      const delivery = (await page.$$('[data-test="mms-delivery-online-availability_AVAILABLE"]')).length
      const inShop = (await page.$$('[data-test="mms-delivery-market-availability_AVAILABLE"]')).length

      return `${items} products (${delivery} delivery - ${inShop} in shop)`
    }
  },
  {
    key: 'mielectro',
    name: 'Mielectro',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))

      return price[3] ? price[3]?.replaceAll('.', '') : 'NO STOCK'
    }
  },
  {
    key: 'pccomponentes',
    name: 'PcComponentes',
    jsEnabled: false,
    auth: false,
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
    auth: false,
    checkPrice: async ({ page }) => {
      if (await checkCaptcha(page, '#cf-wrapper', true)) return 'CAPTCHA' // Check if captcha

      const items = (await page.$$('article')).length
      const availabilities = await page.$$eval('.c-product-card__availability', nodes => nodes.map(node => node.innerText))
      const stock = availabilities.filter(availability => availability.includes('Recíbelo')).length

      return `${items} products (${stock} stock)`
    }
  },
  {
    key: 'sonyexperience',
    name: 'Sonyexperience',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      return (await page.textContent('.current-price > span'))?.replace('.', '').replace(/\s/g, '')
    }
  },
  {
    key: 'wivai',
    name: 'Wivai',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const itemNames = await page.$$eval('[data-js="tile-title-text"]', nodes => nodes.map(node => node.innerText))
      const stock = itemNames.filter(itemName => itemName.toLowerCase().includes('playstation 5')).length
      const items = (await page.$$('.product-tile')).length

      return `${items} products (${stock} PS5)`
    }
  },
  {
    key: 'worten',
    name: 'Worten',
    jsEnabled: false,
    auth: false,
    checkPrice: async ({ page }) => {
      const hasPrice = (await page.$$('.w-product__price__current.iss-product-current-price')).length > 0
      const price = hasPrice ? await page.textContent('.w-product__price__current.iss-product-current-price') : ''
      const stock = (await page.$$('.iss-product-availability')).length > 0 ? '' : '(NO STOCK)'

      return hasPrice ? `${price} ${stock}` : 'NO STOCK'
    }
  },
  {
    key: 'wortenquery',
    name: 'Worten query',
    jsEnabled: true,
    auth: false,
    checkPrice: async ({ page }) => {
      const found = await searchItem(page, 'figure > img')
      if (!found) return 'NOT FOUND 😵'

      const items = (await page.$$('.w-product__wrapper')).length

      return `${items} products`
    }
  },
  {
    key: 'xtralife',
    name: 'Xtralife',
    jsEnabled: true,
    auth: false,
    checkPrice: async ({ page }) => {
      const found = await searchItem(page, 'a > img')
      if (!found) return 'NOT FOUND 😵'

      const items = (await page.$$('.view-smallGridElement')).length
      const buttons = await page.$$eval('.cursorPointer.fontBold.fontNormal.h-40.primaryButtonYellowXl', nodes => nodes.map(node => node.innerText))
      const stock = buttons.filter(button => button.includes('Añadir a cesta')).length

      return `${items} products (${stock} stock)`
    }
  }
]

const checkCaptcha = async (page, element, has) => {
  const captcha = (await page.$$(element)).length

  if (has ? captcha > 0 : captcha === 0) {
    logs.error('☠️ · Captcha detected! · ⬇')
    return true
  }

  return false
}

const searchItem = async (page, selector) => {
  try {
    await page.waitForSelector(selector)
  } catch (err) {
    logs.error('😵 · NOT FOUND · ⬇')
    return false
  }

  return true
}
