/**
 * The storefront designs a merchant can pick in their profile.
 *
 * 'classic' is the original storefront and the default — a store that never
 * picked one, or whose saved key is no longer offered, keeps looking the way it
 * always has. Keys are stored in merchants.storefront_theme; keep them in step
 * with STOREFRONT_THEMES in backend/src/utils/mappers.js.
 *
 * Every theme is painted in the merchant's own colours (--merchant-primary /
 * --merchant-shadow) and works in both light and dark mode. Only the page's
 * face changes — the cart, checkout and product sheet are shared, so ordering
 * behaves the same whichever design a store wears.
 */
export const STOREFRONT_THEMES = [
  'classic',
  'royal',
  'modern',
  'pure',
  'cafe',
  'neon',
  'magazine',
  'street',
  'garden',
  'boutique',
]

export const DEFAULT_STOREFRONT_THEME = 'classic'

export function normalizeStorefrontTheme(value) {
  return STOREFRONT_THEMES.includes(value) ? value : DEFAULT_STOREFRONT_THEME
}

/**
 * Designs built from the theme kit (components/public/themes/ThemeKit.jsx):
 * a header, a category navigation and an item layout, picked from the kit's
 * parts, then dressed by that theme's own CSS (index.css, .sf-theme-<key>).
 * Classic, royal and modern have components of their own.
 *
 *   header: 'center' | 'split' | 'cover' | 'hero'
 *   nav:    'pills' | 'tabs'           (numbered: 01, 02 … on tabs and headings)
 *   items:  'row' | 'card' | 'editorial'
 */
export const KIT_LAYOUTS = {
  pure: { header: 'split', nav: 'pills', items: 'row' },
  cafe: { header: 'center', nav: 'pills', items: 'row' },
  neon: { header: 'cover', nav: 'pills', items: 'card' },
  magazine: { header: 'hero', nav: 'tabs', items: 'editorial', numbered: true },
  street: { header: 'split', nav: 'pills', items: 'card' },
  garden: { header: 'center', nav: 'pills', items: 'card' },
  boutique: { header: 'center', nav: 'tabs', items: 'card' },
}

/**
 * Display fonts a theme needs beyond the app's own (Cairo / Inter). Loaded only
 * on a storefront wearing that theme, so no other page pays for them.
 */
export const THEME_FONT_URLS = {
  royal: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap',
  cafe: 'https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@500;700&display=swap',
  magazine: 'https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;700&display=swap',
  street: 'https://fonts.googleapis.com/css2?family=Lalezar&display=swap',
  boutique: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;500;700&display=swap',
}

/**
 * How far below the top of the viewport a section's heading must reach before
 * the category navigation calls it current — the height of that theme's
 * sticky bar, plus breathing room. Classic's bar isn't sticky; the kit's bars
 * are all about the same height.
 */
export const SCROLL_SPY_OFFSETS = { classic: 100, royal: 120, modern: 150, kit: 130 }

/**
 * The frame each design shows a product's cover in, for the cover-framing
 * editor (components/menu/CoverFocusEditor): its aspect ratio, whether it is
 * round, and where the photo sits when the merchant hasn't dragged it — the
 * classic card has always shown the top of the photo.
 */
const SQUARE = { aspect: '1 / 1', round: false, fallback: '50% 50%' }
export const CARD_FRAMES = {
  classic: { aspect: '4 / 3', round: false, fallback: '50% 0%' },
  royal: SQUARE,
  modern: SQUARE,
  pure: SQUARE,
  cafe: SQUARE,
  neon: SQUARE,
  magazine: { aspect: '4 / 5', round: false, fallback: '50% 50%' },
  street: SQUARE,
  garden: { aspect: '1 / 1', round: true, fallback: '50% 50%' },
  boutique: { aspect: '3 / 4', round: false, fallback: '50% 50%' },
}

export function cardFrame(themeKey) {
  return CARD_FRAMES[normalizeStorefrontTheme(themeKey)]
}
