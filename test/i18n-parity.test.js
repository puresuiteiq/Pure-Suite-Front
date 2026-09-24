import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Locale parity.
 *
 * English is the fallback, so a key missing from ar/ku-badini degrades to
 * English rather than breaking — which is exactly why drift here is invisible
 * until an Arabic-speaking merchant notices half the screen is in English.
 * This locks in the current state (all three complete) so the next gap fails
 * a test instead of shipping.
 */

const LOCALES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'i18n',
  'locales',
)

// i18next appends these to a base key. `ar` legitimately carries all six CLDR
// Arabic plural categories where en/ku need only two, so a bare key-set
// comparison would report ~30 false differences.
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']
// useVerticalT() injects a `context`, so any key may have a vertical variant.
const CONTEXT_SUFFIXES = ['_store', '_restaurant']
// A translator note carried in ku-badini, not a UI string.
const NON_KEYS = new Set(['_note'])

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, full, out)
    } else {
      out[full] = child
    }
  }
  return out
}

function load(lang) {
  return flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf8')))
}

/** Strip one i18next suffix, so `items_few` is checked against `items`. */
function baseKey(key) {
  for (const suffix of [...PLURAL_SUFFIXES, ...CONTEXT_SUFFIXES]) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length)
  }
  return key
}

const en = load('en')
const ar = load('ar')
const ku = load('ku-badini')

test('every English key exists in Arabic and Kurdish Badini', () => {
  for (const [lang, locale] of [
    ['ar', ar],
    ['ku-badini', ku],
  ]) {
    const missing = Object.keys(en).filter((key) => !(key in locale))
    assert.deepEqual(
      missing,
      [],
      `${lang}.json is missing ${missing.length} key(s):\n  ${missing.join('\n  ')}`,
    )
  }
})

test('no translated key is orphaned — every one traces back to English', () => {
  for (const [lang, locale] of [
    ['ar', ar],
    ['ku-badini', ku],
  ]) {
    const orphans = Object.keys(locale).filter((key) => {
      if (NON_KEYS.has(key) || NON_KEYS.has(key.split('.').pop())) return false
      if (key in en) return false
      // A plural or vertical variant is valid when its base exists in English,
      // either bare or as the `_other` form.
      const base = baseKey(key)
      return !(base in en) && !(`${base}_other` in en)
    })
    assert.deepEqual(
      orphans,
      [],
      `${lang}.json has ${orphans.length} key(s) with no English counterpart ` +
        `(a typo, or a key removed from en but left behind):\n  ${orphans.join('\n  ')}`,
    )
  }
})

test('no locale ships an empty string', () => {
  for (const [lang, locale] of [
    ['en', en],
    ['ar', ar],
    ['ku-badini', ku],
  ]) {
    const blank = Object.entries(locale)
      .filter(([, value]) => typeof value === 'string' && value.trim() === '')
      .map(([key]) => key)
    assert.deepEqual(blank, [], `${lang}.json has blank value(s): ${blank.join(', ')}`)
  }
})

test('interpolation placeholders match across languages', () => {
  // A translation that drops {{count}} or renames {{name}} renders a literal
  // placeholder, or silently loses the number, in that language only.
  const placeholders = (value) =>
    typeof value === 'string'
      ? [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort()
      : []

  const mismatches = []
  for (const [lang, locale] of [
    ['ar', ar],
    ['ku-badini', ku],
  ]) {
    for (const [key, value] of Object.entries(locale)) {
      const source = en[key]
      if (source === undefined) continue
      const want = placeholders(source)
      const got = placeholders(value)
      // Arabic's _one/_two forms deliberately spell the number out instead of
      // interpolating it, so a translation may use FEWER placeholders. Using
      // one English never defined is always a bug.
      const extra = got.filter((p) => !want.includes(p))
      if (extra.length) mismatches.push(`${lang}: ${key} uses unknown {{${extra.join('}}, {{')}}}`)
    }
  }
  assert.deepEqual(mismatches, [], mismatches.join('\n'))
})
