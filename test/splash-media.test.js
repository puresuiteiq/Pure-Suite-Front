import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SPLASH_VIDEO_MAX_BYTES,
  SplashFileError,
  assertSplashFile,
  splashFileKind,
  splashUploadError,
} from '../src/utils/splashMedia.js'

/**
 * The welcome-screen background check that runs before an upload starts. Its
 * point is to refuse a file the API would refuse anyway, before a merchant on
 * mobile data spends a minute sending it.
 */

const fakeFile = (type, size = 1000) => ({ type, size })

test('splashFileKind sorts pictures from the videos browsers can play', () => {
  assert.equal(splashFileKind(fakeFile('image/jpeg')), 'image')
  assert.equal(splashFileKind(fakeFile('image/webp')), 'image')
  assert.equal(splashFileKind(fakeFile('video/mp4')), 'video')
  // What an iPhone hands the file picker.
  assert.equal(splashFileKind(fakeFile('video/quicktime')), 'video')
  assert.equal(splashFileKind(fakeFile('video/x-msvideo')), null)
  assert.equal(splashFileKind(fakeFile('application/pdf')), null)
  assert.equal(splashFileKind(null), null)
})

test('assertSplashFile refuses a video over the limit, naming the limit', () => {
  assert.throws(
    () => assertSplashFile(fakeFile('video/mp4', SPLASH_VIDEO_MAX_BYTES + 1)),
    (err) => {
      assert.ok(err instanceof SplashFileError)
      assert.equal(err.code, 'SPLASH_VIDEO_TOO_LARGE')
      // Both sizes, so the merchant sees how far over they are.
      assert.deepEqual(err.params, { size: '10', max: 10 })
      return true
    },
  )
  assert.equal(assertSplashFile(fakeFile('video/mp4', SPLASH_VIDEO_MAX_BYTES)), 'video')
})

test('assertSplashFile leaves a large picture to the downscaler', () => {
  // A 20 MB photo is fine here — it is shrunk before it is sent.
  assert.equal(assertSplashFile(fakeFile('image/jpeg', 20 * 1024 * 1024)), 'image')
})

test('assertSplashFile refuses anything else with a translatable code', () => {
  assert.throws(() => assertSplashFile(fakeFile('text/html')), { code: 'SPLASH_MEDIA_INVALID' })
})

test('a 413 with no API code (a proxy refused it) gets its own message, with the size sent', () => {
  const proxy = Object.assign(new Error('Request failed: 413 Payload Too Large'), { status: 413, code: null })
  const mapped = splashUploadError(proxy, { size: 8.4 * 1024 * 1024 })
  assert.equal(mapped.code, 'SPLASH_UPLOAD_REJECTED')
  assert.deepEqual(mapped.params, { size: '8.4' })

  // The API's own 413 already carries a translatable code — left alone.
  const api = Object.assign(new Error('too large'), { status: 413, code: 'SPLASH_MEDIA_TOO_LARGE' })
  assert.equal(splashUploadError(api, { size: 1 }), api)
})
