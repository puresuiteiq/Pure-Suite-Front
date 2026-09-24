/**
 * Supported languages. `dir` drives the document direction (Arabic and
 * Kurdish Badini are right-to-left). `label` is the language's own name;
 * `short` is the compact code shown in the switcher button.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
  { code: 'ku-badini', label: 'کوردیی بادینی', short: 'کو', dir: 'rtl' },
]

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

const RTL = new Set(LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code))

/** Direction ('rtl' | 'ltr') for a language code. */
export function directionFor(code) {
  return RTL.has(code) ? 'rtl' : 'ltr'
}
