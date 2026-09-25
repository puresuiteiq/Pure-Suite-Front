/**
 * Money formatting, with no imports.
 *
 * format.js wraps these with the active UI language, but it imports the i18n
 * runtime, which plain `node --test` cannot load. Keeping the formatting itself
 * here means the rules that decide what a customer reads as a price are
 * testable.
 *
 * Values are already stored in their selected currency, so nothing is converted
 * here. IQD has no minor unit in practice; USD keeps up to two decimals.
 */

const dinars = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const dollars = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const PRODUCT_CURRENCIES = ['IQD', 'USD']

export function normalizeCurrency(currency) {
  const value = String(currency ?? 'IQD').trim().toUpperCase()
  return PRODUCT_CURRENCIES.includes(value) ? value : 'IQD'
}

/**
 * U+00A0, the non-breaking space between an amount and its unit.
 *
 * With an ordinary space, a narrow button wrapped "25,000" onto one line and
 * "د.ع" onto the next.
 */
export const NBSP = '\u00A0'

/**
 * The dinar unit for a language: the Latin code "IQD" in English, the Arabic
 * abbreviation "د.ع" in Arabic and Kurdish (both written in Arabic script).
 */
export function dinarUnit(lang) {
  return String(lang || 'en').split('-')[0] === 'en' ? 'IQD' : 'د.ع'
}

export function dollarUnit(lang) {
  return String(lang || 'en').split('-')[0] === 'en' ? 'USD' : 'دولار'
}

export function currencyUnit(currency, lang) {
  return normalizeCurrency(currency) === 'USD' ? dollarUnit(lang) : dinarUnit(lang)
}

/**
 * The grouped number alone, without the unit — for money columns, which align
 * the unit separately. Printed inline, the unit drifts sideways as the digit
 * count grows, so a column of them never lines up. Everywhere else, use
 * formatDinars / formatCurrency.
 */
export function formatAmount(value) {
  return dinars.format(Math.round(Number(value) || 0))
}

/** A price in dinars for `lang`, e.g. (2600, 'ar') -> "2,600 د.ع". */
export function formatDinars(value, lang) {
  return `${formatAmount(value)}${NBSP}${dinarUnit(lang)}`
}

export function formatMoney(value, currency = 'IQD', lang) {
  const normalized = normalizeCurrency(currency)
  const amount =
    normalized === 'USD'
      ? dollars.format(Number(value) || 0)
      : formatAmount(value)
  return `${amount}${NBSP}${currencyUnit(normalized, lang)}`
}
