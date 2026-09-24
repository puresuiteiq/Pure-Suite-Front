import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Every literal translation key used in the app must exist in en.json.
 *
 * i18next renders a missing key as the key itself, so the failure ships as UI
 * text: `merchantDetails.copyNote` was displayed verbatim in the panel that
 * shows an admin-reset password exactly once, and the entire password-reset
 * feature used 22 keys that existed in no locale at all. Nothing failed, no
 * warning appeared — the screens just read like debug output.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

// Base keys must exist in English; i18next resolves suffixed variants back to
// them (plural via `count`, vertical via useVerticalT's `context`).
const SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other', '_store', '_restaurant']

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out)
    else out[full] = child
  }
  return out
}

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, found)
    else if (/\.jsx?$/.test(entry.name)) found.push(full)
  }
  return found
}

/**
 * Pull literal keys out of `t(...)` / `rawT(...)` calls.
 *
 * Two things this must NOT do:
 *
 *  - Match a method whose name merely ends in "t", such as
 *    `params.get('token')`. The lookbehind rejects a preceding word character
 *    or dot, which is what distinguishes `t(` from `.get(`.
 *  - Flag dynamic keys. `` t(`profile.social.${network}`) `` cannot be checked
 *    statically, so template literals are skipped entirely.
 *
 * Keys are required to be dotted, which every key in this project is (they are
 * all namespaced). That filter keeps ordinary string arguments — option values,
 * CSS classes, a defaultValue — from being mistaken for keys.
 */
const CALL = /(?<![\w.$])(?:t|rawT)\(([^)]*)\)/g
const LITERAL = /'([^'\\]*)'/g
const LOOKS_LIKE_KEY = /^[a-zA-Z][\w-]*(?:\.[\w-]+)+$/

function extractKeys(source) {
  const keys = new Set()
  for (const call of source.matchAll(CALL)) {
    const args = call[1]
    for (const literal of args.matchAll(LITERAL)) {
      const candidate = literal[1]
      if (LOOKS_LIKE_KEY.test(candidate)) keys.add(candidate)
    }
  }
  return keys
}

const en = flatten(JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/en.json'), 'utf8')))

function resolves(key) {
  if (key in en) return true
  // A caller may pass the base key while i18next appends a suffix at runtime.
  if (SUFFIXES.some((s) => `${key}${s}` in en)) return true
  // Or the caller may already name a variant whose base is what's defined.
  for (const suffix of SUFFIXES) {
    if (key.endsWith(suffix) && key.slice(0, -suffix.length) in en) return true
  }
  return false
}

test('every literal t() key used in src/ exists in en.json', () => {
  const unresolved = []
  for (const file of sourceFiles(SRC)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const key of extractKeys(source)) {
      if (!resolves(key)) unresolved.push(`${path.relative(ROOT, file)} -> ${key}`)
    }
  }
  assert.deepEqual(
    unresolved,
    [],
    `${unresolved.length} translation key(s) would render as raw key text:\n  ` +
      unresolved.join('\n  '),
  )
})

test('the extractor does not mistake .get() for t()', () => {
  // Regression guard for the lookbehind: ResetPassword.jsx contains
  // `params.get('token')`, which an earlier naive scan reported as a missing
  // key called "token".
  const keys = extractKeys("const token = params.get('token') || ''")
  assert.equal(keys.size, 0, `expected no keys, got: ${[...keys].join(', ')}`)
})

test('the extractor finds the forms actually used in this codebase', () => {
  const keys = extractKeys(`
    <h1>{t('auth.forgotTitle')}</h1>
    {t('auth.passwordMinLength', { min: 8 })}
    {rawT('common.cancel')}
    {t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
    {t(\`profile.social.\${network}\`)}
  `)
  assert.ok(keys.has('auth.forgotTitle'), 'plain call')
  assert.ok(keys.has('auth.passwordMinLength'), 'call with interpolation options')
  assert.ok(keys.has('common.cancel'), 'rawT from useVerticalT')
  assert.ok(keys.has('auth.hidePassword') && keys.has('auth.showPassword'), 'ternary')
  assert.equal([...keys].some((k) => k.includes('$')), false, 'template literals skipped')
})
