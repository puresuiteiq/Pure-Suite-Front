import i18n from '../i18n/config'
import { dinarUnit, formatDinars } from './currency'

// The formatting rules live in currency.js, which has no imports so they can
// be unit-tested; these wrappers only supply the active UI language.
export { formatAmount } from './currency'

/**
 * The dinar unit, localised: "IQD" in English, "د.ع" in Arabic and Kurdish. A
 * function, not a constant, so it re-reads the active language each render.
 */
export function currencySuffix() {
  return dinarUnit(i18n.language)
}

/**
 * Format a price in Iraqi dinars, e.g. 2600 -> "2,600 د.ع", with a
 * non-breaking space so the amount and unit never wrap apart.
 *
 * IQD is the only currency in the system — every stored price already IS
 * dinars, so nothing is converted here.
 */
export function formatCurrency(value) {
  return formatDinars(value, i18n.language)
}

// Dates follow the active language so they don't sit as left-to-right English
// text inside an Arabic/Kurdish (RTL) page. Kurdish Badini is written in Arabic
// script, so it borrows the Arabic locale's month names. Digits are kept Latin
// (numberingSystem: 'latn') to stay consistent with prices, which use Latin
// digits. A getter (not a cached formatter) so it re-reads the language.
const localeFor = () => {
  const lang = (i18n.language || 'en').split('-')[0]
  return lang === 'ar' || lang === 'ku' ? 'ar' : 'en-US'
}

const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn' }
const DATE_TIME_OPTS = { ...DATE_OPTS, hour: 'numeric', minute: '2-digit' }

/** Format an ISO date string (YYYY-MM-DD), localised (e.g. "Jul 5, 2026"). */
export function formatDate(value) {
  if (!value) return ''
  // Anchor to local midnight so the day doesn't shift across time zones.
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(localeFor(), DATE_OPTS).format(date)
}

/** Format a full timestamp, localised (e.g. "Jul 5, 2026, 3:42 PM"). */
export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(localeFor(), DATE_TIME_OPTS).format(date)
}
