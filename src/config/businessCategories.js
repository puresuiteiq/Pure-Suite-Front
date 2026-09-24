/**
 * Business categories a merchant can be classified as. The Super Admin picks one
 * (or types a custom name) when creating/editing a merchant.
 *
 * Each category maps to one of two *behaviour modes* — the platform only has two
 * ways of behaving, no matter how many category labels exist:
 *   - 'restaurant' → menu wording ("Menu / Dishes"), size variants, no inventory
 *   - 'store'      → catalog wording ("Catalog / Products"), brand + stock + gallery
 *
 * So adding a category is just a label + which mode it behaves like; it never
 * needs new code. `mode` is consumed by useVerticalT (wording) and the item form
 * (which fields show). Every merchant has the SAME single admin role regardless.
 *
 * FOOD_MODE note: only prepared-food businesses are 'restaurant' (menu, no
 * stock). Inventory businesses — including supermarket/grocery — are 'store' so
 * they get stock + brand, which a stock-less menu can't offer. To move a
 * category between modes, just change its `mode` here.
 */
export const BUSINESS_CATEGORIES = [
  { key: 'restaurant', mode: 'restaurant' },
  { key: 'cafe', mode: 'restaurant' },
  { key: 'bakery', mode: 'restaurant' },
  { key: 'food_drinks', mode: 'restaurant' },
  { key: 'supermarket', mode: 'store' },
  { key: 'electronics', mode: 'store' },
  { key: 'clothes_fashion', mode: 'store' },
  { key: 'jewellery', mode: 'store' },
  { key: 'pharmacy', mode: 'store' },
]

/** Custom (free-text) categories behave as a store — catalog + inventory. */
const CUSTOM_MODE = 'store'

const MODE_BY_KEY = new Map(BUSINESS_CATEGORIES.map((c) => [c.key, c.mode]))

/** Is this a predefined category key (vs a custom free-text name)? */
export const isKnownCategory = (type) => MODE_BY_KEY.has(type)

/**
 * Behaviour mode ('restaurant' | 'store') for a stored business_type, which is
 * either a predefined key or a custom name. Unknown/custom → 'store'. Empty →
 * 'restaurant' (the platform's original default).
 */
export function modeForBusinessType(type) {
  if (!type) return 'restaurant'
  return MODE_BY_KEY.get(type) ?? CUSTOM_MODE
}

// Which set of example placeholders the product-option fields should show, so a
// clothing shop sees "Size, Color / Large" and a phone shop sees "Storage /
// 256GB" — not the other way round. Maps a business_type to one of a few groups;
// the actual example strings live in i18n under menu.optionExamples.<group>.
const EXAMPLE_GROUP = {
  clothes_fashion: 'clothing',
  jewellery: 'jewellery',
  electronics: 'electronics',
  pharmacy: 'pharmacy',
  restaurant: 'food',
  cafe: 'cafe',
  bakery: 'bakery',
  food_drinks: 'food',
  supermarket: 'market',
}

/** Example-placeholder group for a business_type. Empty → food (the default). */
export function optionExampleGroup(type) {
  if (!type) return 'food'
  return EXAMPLE_GROUP[type] ?? 'generic'
}

// Business types where a suitable age range is meaningful — apparel-style shops
// and toys. It makes no sense for phones/electronics, groceries, etc., so the
// item form only offers the age field for these.
const AGE_RANGE_TYPES = new Set([
  'clothes_fashion',
])

/** Does this business_type sell items with a suitable age range (clothes, toys)? */
export const supportsAgeRange = (type) => AGE_RANGE_TYPES.has(type)

/**
 * Human label for a business_type: a translated label for a known key, or the
 * raw custom string as typed. `t` is a translation function.
 */
export function businessTypeLabel(type, t) {
  if (!type) return ''
  return isKnownCategory(type) ? t(`businessTypes.${type}`) : type
}
