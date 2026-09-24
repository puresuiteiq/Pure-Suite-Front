import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filesToDataUrls,
  assertImageFile,
  dataUrlBytes,
  targetSize,
  ImageError,
  MAX_DIMENSION,
  MAX_SOURCE_BYTES,
} from '../src/utils/image.js'

/**
 * The parts of the image pipeline that are pure arithmetic and validation.
 *
 * The canvas encoding itself needs a DOM and is left to manual testing; these
 * cover the rules that decide whether a file is read at all and what size it is
 * scaled to — which is where the cost, and the original bug, lived.
 */

const fakeFile = (type, size) => ({ type, size })

test('rejects anything that is not an image', () => {
  // accept="image/*" on the input is only a picker hint. Drag-and-drop and
  // "All files" both bypass it, so the real check has to be here.
  assert.throws(() => assertImageFile(fakeFile('application/pdf', 1000)), (err) => {
    assert.ok(err instanceof ImageError)
    assert.equal(err.code, 'IMAGE_NOT_AN_IMAGE')
    return true
  })
  assert.throws(() => assertImageFile(fakeFile('', 1000)), /IMAGE_NOT_AN_IMAGE/)
  assert.throws(() => assertImageFile(null), /IMAGE_INVALID/)
})

test('rejects an oversized file before it is ever read', () => {
  // The point is that this happens before FileReader touches the file, so a
  // 40 MB photo never enters memory on a phone.
  assert.throws(
    () => assertImageFile(fakeFile('image/jpeg', MAX_SOURCE_BYTES + 1)),
    (err) => {
      assert.equal(err.code, 'IMAGE_TOO_LARGE')
      assert.equal(typeof err.params.limit, 'number', 'carries a limit for the message')
      return true
    },
  )
})

test('accepts an ordinary photo', () => {
  assert.doesNotThrow(() => assertImageFile(fakeFile('image/jpeg', 4 * 1024 * 1024)))
  assert.doesNotThrow(() => assertImageFile(fakeFile('image/png', 100 * 1024)))
  assert.doesNotThrow(() => assertImageFile(fakeFile('image/svg+xml', 20 * 1024)))
})

test('targetSize scales the longest edge down, preserving aspect ratio', () => {
  assert.deepEqual(targetSize(4000, 3000, 1280), { width: 1280, height: 960 })
  assert.deepEqual(targetSize(3000, 4000, 1280), { width: 960, height: 1280 }, 'portrait')
  assert.deepEqual(targetSize(2000, 2000, 512), { width: 512, height: 512 }, 'square')
})

test('targetSize never enlarges a small image', () => {
  // Upscaling would grow the payload while adding no detail at all.
  assert.deepEqual(targetSize(200, 150, 1280), { width: 200, height: 150 })
  assert.deepEqual(targetSize(1280, 720, 1280), { width: 1280, height: 720 }, 'exactly at the cap')
})

test('targetSize tolerates a zero dimension without dividing by zero', () => {
  assert.deepEqual(targetSize(0, 0, 512), { width: 0, height: 0 })
})

test('caps are large enough for the screens this is used on', () => {
  assert.ok(MAX_DIMENSION.logo < MAX_DIMENSION.gallery, 'a logo needs far less than a photo')

  // A product photo is shown at full viewport width in the detail sheet, so a
  // 430px phone at 3x device-pixel-ratio needs ~1290 real pixels. Below that
  // and photos visibly soften on exactly the devices this runs on.
  assert.ok(
    MAX_DIMENSION.gallery >= 1290,
    `gallery cap ${MAX_DIMENSION.gallery} is below what a 430px phone at 3x needs`,
  )

  // An uploaded logo renders at 112 CSS pixels at its largest (the profile
  // preview and the admin branding card), so 512 is already 4x oversampled.
  // Note this cap governs uploaded logos only — the bundled platform mark is a
  // build asset, sized separately.
  assert.ok(MAX_DIMENSION.logo >= 112 * 3, 'logo cap should cover a 3x display')
})

test('dataUrlBytes approximates the decoded payload size', () => {
  // 4 base64 characters carry 3 bytes.
  assert.equal(dataUrlBytes('data:image/png;base64,' + 'A'.repeat(4)), 3)
  assert.equal(dataUrlBytes('data:image/png;base64,' + 'A'.repeat(400)), 300)
  assert.equal(dataUrlBytes('not-a-data-url'), 0, 'no comma, no payload')
})

test('a base64 data URL is meaningfully larger than its source bytes', () => {
  // This inflation is why uploads that looked fine locally hit the API's body
  // limit: base64 adds roughly a third.
  const sourceBytes = 3 * 1024 * 1024
  const encodedChars = Math.ceil(sourceBytes / 3) * 4
  assert.ok(encodedChars > sourceBytes * 1.3, 'base64 inflates by about 33%')
})

test('a batch keeps the files that worked and reports the ones that did not', async () => {
  // Selecting five photos where the third is a PDF must not discard the other
  // four. Only the validation path runs here — a real image needs a DOM.
  const { images, failed } = await filesToDataUrls([
    { type: 'application/pdf', size: 100 },
    { type: 'image/jpeg', size: MAX_SOURCE_BYTES + 1 },
  ])
  assert.deepEqual(images, [], 'neither of these is usable')
  assert.equal(failed.length, 2)
  assert.equal(failed[0].error.code, 'IMAGE_NOT_AN_IMAGE')
  assert.equal(failed[1].error.code, 'IMAGE_TOO_LARGE')
})

test('an empty batch is not an error', async () => {
  const { images, failed } = await filesToDataUrls([])
  assert.deepEqual(images, [])
  assert.deepEqual(failed, [])
})
