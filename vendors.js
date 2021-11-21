const vendorsData = require('./vendorsData.json')

exports.vendors = [
  // {
  //   key: 'worten',
  //   name: vendorsData.worten.name,
  //   items: vendorsData.worten.items,
  //   checkPrice: async ({ page }) => {
  //     return await page.textContent('.iss-product-current-price')
  //   }
  // },
  {
    key: 'wivai',
    name: vendorsData.wivai.name,
    items: vendorsData.wivai.items,
    checkPrice: async ({ page }) => {
      const items = (await page.$$('.product-tile')).length
      return `${items} productos`
    }
  },
  {
    key: 'mediamarkt',
    name: vendorsData.mediamarkt.name,
    items: vendorsData.mediamarkt.items,
    checkPrice: async ({ page }) => {
      const price = (await page.textContent('[font-family="price"]'))?.split(".")[0] + "€"
      const stock = (await page.$$('#pdp-add-to-cart-button')).length > 0 ? "" : '(NO STOCK)'

      return `${price} ${stock}`
    }
  },
  {
    key: 'elcorteingles',
    name: vendorsData.elcorteingles.name,
    items: vendorsData.elcorteingles.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.price._big')).length > 0
      return stock ? (await page.textContent('.price._big'))?.replaceAll(".", "").replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'pcccomponentes',
    name: vendorsData.pcccomponentes.name,
    items: vendorsData.pcccomponentes.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('#precio-main')).length > 0
      return stock ? await page.textContent('#precio-main') : 'NO STOCK'
    }
  },
  {
    key: 'mielectro',
    name: vendorsData.mielectro.name,
    items: vendorsData.mielectro.items,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))
      return price[3] ? price[3]?.replaceAll(".", "") : 'NO STOCK'
    }
  },
  {
    key: 'amazon',
    name: vendorsData.amazon.name,
    items: vendorsData.amazon.items,
    checkPrice: async ({ page }) => {
      // [data-action="sp-cc"]
      await page.$$eval('[data-action="sp-cc"]', nodes => nodes.forEach(node => node.style.display = "none"))
      const stock = (await page.$$('.a-price.a-text-price.a-size-medium')).length > 0
      return stock ? ((await page.textContent('.a-price.a-text-price.a-size-medium'))?.replaceAll(".", "").split('€')[0] + '€') : 'NO STOCK'

    }
  },
  {
    key: 'game',
    name: vendorsData.game.name,
    items: vendorsData.game.items,
    checkPrice: async ({ page }) => {
      const stock = (await page.$$('.buy-xl.buy-new > .buy--price')).length > 0
      return stock ? (await page.textContent('.buy-xl.buy-new > .buy--price'))?.trim().replace(/\s/g, '') : 'NO STOCK'
    }
  },
  {
    key: 'sonyexperience',
    name: vendorsData.sonyexperience.name,
    items: vendorsData.sonyexperience.items,
    checkPrice: async ({ page }) => {
      return (await page.textContent('.current-price > span'))?.replace(".", "").replace(/\s/g, '')
    }
  }
]
