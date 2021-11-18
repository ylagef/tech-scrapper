const vendorsData = require('./vendorsData.json')

exports.vendors = [
  {
    key: 'mediamarkt',
    name: 'Mediamarkt',
    items: vendorsData.mediamarkt.items,
    checkPrice: async ({ page }) => {
      return await page.textContent('[font-family="price"]')
    }
  },
  {
    key: 'worten',
    name: vendorsData.worten.name,
    items: vendorsData.worten.items,
    checkPrice: async ({ page }) => {
      return await page.textContent('.iss-product-current-price')
    }
  },
  {
    key: 'elcorteingles',
    name: vendorsData.elcorteingles.name,
    items: vendorsData.elcorteingles.items,
    checkPrice: async ({ page }) => {
      return await page.textContent('[data-synth="LOCATOR_PRECIO_OFERTA"]')
    }
  },
  {
    key: 'pcccomponentes',
    name: vendorsData.pcccomponentes.name,
    items: vendorsData.pcccomponentes.items,
    checkPrice: async ({ page }) => {
      return await page.textContent('#precio-main')
    }
  },
  {
    key: 'mielectro',
    name: vendorsData.mielectro.name,
    items: vendorsData.mielectro.items,
    checkPrice: async ({ page }) => {
      const price = await page.$$eval('.mod-precio-mielectro-rojo', nodes => nodes.map(node => node.innerText))
      return price[3]
    }
  }
]
