/**
 * Iraqi dinar formatting, with no imports.
 *
 * format.js wraps these with the active UI language, but it imports the i18n
 * runtime, which plain `node --test` cannot load. Keeping the formatting itself
 * here means the rules that decide what a customer reads as a price are
 * testable.
 *
 * IQD is the only currency in the system — every stored price already IS
 * dinars, so nothing is converted. The dinar has no minor unit in practice, so
 * amounts are always whole.
 */

const dinars = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

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

/**
 * The grouped number alone, without the unit — for money *columns*, which
 * align the unit separately. Printed inline, the unit drifts sideways as the
 * digit count grows (20,800 pushes it further than 1,300), so a column of them
 * never lines up. Everywhere else, use formatDinars / formatCurrency.
 */
export function formatAmount(value) {
  return dinars.format(Math.round(Number(value) || 0))
}

/** A price in dinars for `lang`, e.g. (2600, 'ar') -> "2,600 د.ع". */
export function formatDinars(value, lang) {
  return `${formatAmount(value)}${NBSP}${dinarUnit(lang)}`
}
