/**
 * Checking the storefront welcome-screen background before upload.
 *
 * A picture is downscaled like every other image (sized for a full screen
 * rather than a card). A video cannot be re-encoded in the browser, so it is
 * only checked — and checked here, before a merchant on mobile data spends a
 * minute uploading a file the API would refuse.
 *
 * The API re-checks both from the bytes themselves; this is for a quick,
 * translated answer, not for safety. Import-free, so `npm test` can load it.
 */

/** Matches SPLASH_MAX_BYTES.video in backend/src/utils/splash.js. */
export const SPLASH_VIDEO_MAX_BYTES = 10 * 1024 * 1024

/** Longest edge of an uploaded picture: a full-screen background on a large phone or laptop. */
export const SPLASH_IMAGE_MAX_DIM = 1920

/** The containers every current browser plays; .mov is an MP4-family container the API stores as MP4. */
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'])

/**
 * Carries an `errors.<code>` key and its params, which is all translateApiError
 * needs — the same shape as ImageError.
 */
export class SplashFileError extends Error {
  constructor(code, params = {}) {
    super(code)
    this.name = 'SplashFileError'
    this.code = code
    this.params = params
  }
}

/** 'video', 'image' or null — by the file's declared type, the only thing known before reading it. */
export function splashFileKind(file) {
  const type = String(file?.type || '')
  if (VIDEO_TYPES.has(type)) return 'video'
  if (type.startsWith('image/')) return 'image'
  return null
}

/** Throws for a file that will not be accepted; returns its kind otherwise. */
export function assertSplashFile(file) {
  const kind = splashFileKind(file)
  if (!kind) throw new SplashFileError('SPLASH_MEDIA_INVALID')
  // There is no limit on a video's length in seconds — only on its size, which
  // grows with length. The message names both sizes so the merchant can see
  // how far over they are.
  if (kind === 'video' && file.size > SPLASH_VIDEO_MAX_BYTES) {
    throw new SplashFileError('SPLASH_VIDEO_TOO_LARGE', {
      size: megabytes(file.size),
      max: Math.round(SPLASH_VIDEO_MAX_BYTES / (1024 * 1024)),
    })
  }
  return kind
}

/** A byte count as megabytes with one decimal, for messages ("22.4"). */
export function megabytes(bytes) {
  return (Math.round((Number(bytes) / (1024 * 1024)) * 10) / 10).toString()
}

/**
 * The error to show when an upload came back 413 *without* the API's own
 * error code — i.e. something in front of the API (a reverse proxy's body
 * limit, often 1 MB by default) refused it before the API ever saw it. The raw
 * "Request failed: 413 Payload Too Large" told the merchant nothing.
 */
export function splashUploadError(err, body) {
  if (err?.status === 413 && !err.code) {
    return new SplashFileError('SPLASH_UPLOAD_REJECTED', { size: megabytes(body?.size ?? 0) })
  }
  return err
}
