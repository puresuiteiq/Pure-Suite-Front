import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dinarUnit, formatAmount, formatDinars, NBSP } from '../src/utils/currency.js'

/**
 * Prices are Iraqi dinars, written one way.
 *
 * Customers on Android Chrome saw prices in dirham on the storefront. Nothing
 * in the code wrote that: Chrome's auto-translate rewrote the dinar unit
 * because the page declared itself English. These tests pin what the app
 * itself writes, and make sure no source file introduces another currency.
 *
 * Non-ASCII expectations are written as escapes, so what is being compared is
 * visible: a non-breaking space and an ordinary one look identical.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..', '..')

const DINAR_AR = '\u062F.\u0639' // the Arabic abbreviation for dinar
// The Arabic word for dirham — escaped so this file doesn't contain it, and a
// repo-wide search for it finds nothing.
const DIRHAM = '\u062F\u0631\u0647\u0645'

test('an Arabic price is grouped, with a non-breaking space before the unit', () => {
  assert.equal(NBSP, '\u00A0')
  assert.equal(formatDinars(25000, 'ar'), `25,000\u00A0${DINAR_AR}`)
})

test('Kurdish uses the Arabic-script unit; English uses IQD', () => {
  assert.equal(formatDinars(25000, 'ku-badini'), `25,000\u00A0${DINAR_AR}`)
  assert.equal(formatDinars(25000, 'en'), '25,000\u00A0IQD')
  assert.equal(dinarUnit(undefined), 'IQD', 'no language falls back, like i18next, to English')
})

test('amounts are whole dinars and never NaN', () => {
  assert.equal(formatAmount(2599.6), '2,600')
  assert.equal(formatAmount('1300'), '1,300')
  assert.equal(formatAmount(null), '0')
  assert.equal(formatAmount('not a number'), '0')
  assert.equal(formatDinars(1250000, 'ar'), `1,250,000\u00A0${DINAR_AR}`)
})

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, found)
    else if (/\.(jsx?|json|css|html)$/.test(entry.name)) found.push(full)
  }
  return found
}

test('no source file names another currency', () => {
  const files = [
    ...sourceFiles(path.join(REPO, 'saas_project', 'src')),
    ...sourceFiles(path.join(REPO, 'backend', 'src')),
    path.join(REPO, 'saas_project', 'index.html'),
  ]
  const offenders = files.filter((file) => {
    const source = fs.readFileSync(file, 'utf8')
    return source.includes(DIRHAM) || /\bAED\b/.test(source)
  })
  assert.deepEqual(
    offenders.map((file) => path.relative(REPO, file)),
    [],
    'a source file names a currency other than the dinar',
  )
})
