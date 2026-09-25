import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Every backend error code must have a translation in every language.
 *
 * A code with no `errors.<CODE>` key falls back to the server's English text,
 * which is the exact problem codes were introduced to fix — so a missing one is
 * invisible rather than broken, and would quietly leave Arabic and Kurdish
 * users on English error messages forever.
 *
 * This reads the backend registry directly, which is why the codes live in a
 * single enumerable object rather than as scattered string literals.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LOCALES = path.join(HERE, '..', 'src', 'i18n', 'locales')
const REGISTRY = path.join(HERE, '..', '..', 'backend', 'src', 'utils', 'errorCodes.js')

// i18next resolves a plural variant back to the base key it was asked for.
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

const locale = (lang) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES, `${lang}.json`), 'utf8')).errors ?? {}

/**
 * Pull the code values out of the backend's ERROR_CODES object without
 * importing it — the frontend test runner has no reason to load backend code,
 * and the registry is a flat literal.
 */
function backendCodes() {
  const source = fs.readFileSync(REGISTRY, 'utf8')
  const body = source.slice(
    source.indexOf('export const ERROR_CODES = {'),
    source.indexOf('\n}', source.indexOf('export const ERROR_CODES = {')),
  )
  return [...body.matchAll(/^\s{2}([A-Z][A-Z0-9_]*):\s*'([^']+)'/gm)].map((m) => m[2])
}

/** Does `errors.<code>` resolve, either directly or via a plural variant? */
const resolves = (entries, code) =>
  code in entries || PLURAL_SUFFIXES.some((s) => `${code}${s}` in entries)

const CODES = backendCodes()

test('the backend registry is readable and non-empty', () => {
  assert.ok(CODES.length > 0, 'no codes extracted — did ERROR_CODES change shape?')
  assert.ok(CODES.includes('PLAN_IN_USE'), 'expected a known code to be present')
})

test('every backend error code is translated in all three languages', () => {
  const missing = []
  for (const lang of ['en', 'ar', 'ku-badini']) {
    const entries = locale(lang)
    for (const code of CODES) {
      if (!resolves(entries, code)) missing.push(`${lang}: errors.${code}`)
    }
  }
  assert.deepEqual(
    missing,
    [],
    `${missing.length} error code(s) would fall back to English:\n  ${missing.join('\n  ')}`,
  )
})

test('a generic fallback message exists for untagged failures', () => {
  for (const lang of ['en', 'ar', 'ku-badini']) {
    assert.ok(locale(lang).generic, `${lang} is missing errors.generic`)
  }
})

test('no stale translations for codes the backend no longer emits', () => {
  // Codes raised entirely in the browser, which have no backend counterpart:
  // apiClient's own network failure, and the image pipeline's validation, which
  // rejects a file before any request is made.
  const clientOnly = new Set([
    'generic',
    'NETWORK_UNREACHABLE',
    'IMAGE_NOT_AN_IMAGE',
    'IMAGE_READ_FAILED',
    'IMAGE_DECODE_FAILED',
    'IMAGE_INVALID',
    // The welcome-screen upload's own pre-check, and a 413 from a proxy in
    // front of the API (which carries no code of its own).
    'SPLASH_VIDEO_TOO_LARGE',
    'SPLASH_UPLOAD_REJECTED',
  ])
  const known = new Set(CODES)
  const stale = Object.keys(locale('en')).filter((key) => {
    if (clientOnly.has(key)) return false
    const base = PLURAL_SUFFIXES.reduce(
      (k, s) => (k.endsWith(s) ? k.slice(0, -s.length) : k),
      key,
    )
    return !known.has(base)
  })
  assert.deepEqual(stale, [], `errors.* keys with no matching backend code: ${stale.join(', ')}`)
})
