import test from 'node:test'
import assert from 'node:assert/strict'
import {
  KIT_LAYOUTS,
  STOREFRONT_THEMES,
  THEME_FONT_URLS,
  normalizeStorefrontTheme,
} from '../src/config/storefrontThemes.js'
import { itemState } from '../src/utils/itemState.js'

/**
 * Storefront themes. Every design must block the same items and show the same
 * discount as the classic card, and an unknown saved key must fall back to the
 * classic design rather than a blank page.
 */

test('the theme list matches the backend and unknown keys fall back to classic', () => {
  // Keep in step with STOREFRONT_THEMES in backend/src/utils/mappers.js.
  assert.deepEqual(STOREFRONT_THEMES, ['classic', 'royal', 'modern', 'pure', 'cafe', 'neon', 'magazine', 'street', 'garden', 'boutique'])
  assert.equal(normalizeStorefrontTheme('royal'), 'royal')
  assert.equal(normalizeStorefrontTheme(undefined), 'classic')
  assert.equal(normalizeStorefrontTheme('disco'), 'classic')
})

test('every kit design names a header, navigation and item layout the kit has', () => {
  const HEADERS = ['center', 'split', 'cover', 'hero']
  const NAVS = ['pills', 'tabs']
  const ITEMS = ['row', 'card', 'editorial']
  for (const [key, layout] of Object.entries(KIT_LAYOUTS)) {
    assert.ok(STOREFRONT_THEMES.includes(key), `${key} is not an offered theme`)
    assert.ok(HEADERS.includes(layout.header), `${key}: header ${layout.header}`)
    assert.ok(NAVS.includes(layout.nav), `${key}: nav ${layout.nav}`)
    assert.ok(ITEMS.includes(layout.items), `${key}: items ${layout.items}`)
  }
  // Every offered theme is drawn by something: its own components or the kit.
  for (const key of STOREFRONT_THEMES) {
    assert.ok(['classic', 'royal', 'modern'].includes(key) || KIT_LAYOUTS[key], `${key} has no layout`)
  }
  for (const url of Object.values(THEME_FONT_URLS)) assert.match(url, /^https:\/\/fonts\.googleapis\.com\//)
})

test('itemState: an orderable item has no badge', () => {
  const state = itemState({ price: 5000, availability: 'available', image: '/a.jpg' })
  assert.equal(state.blocked, false)
  assert.equal(state.status, null)
  assert.equal(state.cover, '/a.jpg')
})

test('itemState: unavailable, sold out and zero stock all block ordering', () => {
  assert.equal(itemState({ availability: 'unavailable' }).status, 'unavailable')
  assert.equal(itemState({ availability: 'out_of_stock' }).status, 'soldOut')
  assert.equal(itemState({ availability: 'available', stock: 0 }).blocked, true)
  // stock null = not tracked (every restaurant item), never sold out.
  assert.equal(itemState({ availability: 'available', stock: null }).blocked, false)
})

test('itemState: only a higher "was" price counts as a discount', () => {
  const sale = itemState({ price: 7500, originalPrice: 10000 })
  assert.equal(sale.hasDiscount, true)
  assert.equal(sale.discountPct, 25)
  assert.equal(itemState({ price: 7500, originalPrice: 5000 }).hasDiscount, false)
  assert.equal(itemState({ price: 7500, originalPrice: null }).hasDiscount, false)
})

test('itemState: the gallery cover wins over the single image', () => {
  assert.equal(itemState({ images: ['/g0.jpg'], image: '/old.jpg' }).cover, '/g0.jpg')
  assert.equal(itemState({ images: [], image: null }).cover, null)
})
