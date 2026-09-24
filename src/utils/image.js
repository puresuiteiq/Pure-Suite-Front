/**
 * Client-side image preparation for upload.
 *
 * Images are stored as base64 data URLs in MEDIUMTEXT columns and travel inside
 * ordinary JSON requests. Nothing resized, compressed or even measured them
 * first: `readAsDataURL` was called on whatever the file picker returned. A
 * modern phone photo is 3-8 MB, base64 inflates it by a third, and the merchant
 * gallery accepts several at once — so a normal upload could exceed the API's
 * 10 MB body limit and come back as an unexplained failure, while anything that
 * did fit was then re-sent to every customer who opened the storefront.
 *
 * Downscaling here fixes the upload path without new infrastructure. The
 * storefront still inlines galleries; moving those behind an on-demand endpoint
 * is a separate change.
 */

/**
 * Longest-edge targets.
 *
 * 1600 covers the largest place a photo is shown: the detail sheet renders it
 * at full viewport width, so a 430px phone at 3x device-pixel-ratio needs about
 * 1290 real pixels, and a menu card is nearly as wide. Sized below that and
 * photos visibly soften on exactly the phones this is used on.
 *
 * It is affordable because storefront images are served as individual URLs and
 * cached for a year, so resolution is no longer paid for on every page load.
 * Logos display at 176 CSS pixels at most, so 512 is already 3x oversampled.
 * Storefront banners span the full width like a detail-sheet photo, so they
 * get the same budget — the recommended 1600×800 upload passes through at
 * full size.
 */
export const MAX_DIMENSION = { logo: 512, gallery: 1600, banner: 1600 }

/** Hard ceiling on what we will even read, before any processing. */
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024 // 12 MB

/** Ceiling on the produced data URL, comfortably inside the API's 10 MB limit. */
export const MAX_RESULT_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Formats that can carry transparency. Re-encoding one of these to JPEG paints
 * the alpha channel black, which would blacken every logo on the merchants
 * list, the appearance preview and the storefront footer — so these may only
 * ever become WebP or PNG.
 */
const ALPHA_TYPES = new Set(['image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'])

/**
 * Formats an original may be kept in when `rasterize` is set — the ones the API
 * stores for a banner. Anything else (SVG, BMP, TIFF) is always re-encoded.
 */
const STORABLE_RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

export class ImageError extends Error {
  constructor(code, params = {}) {
    super(code)
    this.name = 'ImageError'
    this.code = code
    this.params = params
  }
}

/** Rough byte length of a data URL's payload, without allocating a copy. */
export function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return 0
  const base64 = dataUrl.length - comma - 1
  // 4 base64 chars encode 3 bytes; ignore padding, this is a size guard.
  return Math.floor(base64 * 0.75)
}

/**
 * Reject anything we should not even attempt to read.
 *
 * Checked before FileReader touches the file so a 40 MB image never enters
 * memory on a phone.
 */
export function assertImageFile(file, maxBytes = MAX_SOURCE_BYTES) {
  if (!file) throw new ImageError('IMAGE_INVALID')
  if (!String(file.type || '').startsWith('image/')) {
    // `accept="image/*"` on the input is only a picker hint — it is not
    // enforced, and drag-and-drop or "All files" bypasses it entirely.
    throw new ImageError('IMAGE_NOT_AN_IMAGE')
  }
  if (file.size > maxBytes) {
    throw new ImageError('IMAGE_TOO_LARGE', { limit: Math.round(maxBytes / (1024 * 1024)) })
  }
}

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    // The original had no error/abort handler, so a failed read never settled
    // its promise and the caller's Promise.all hung forever.
    reader.onerror = () => reject(new ImageError('IMAGE_READ_FAILED'))
    reader.onabort = () => reject(new ImageError('IMAGE_READ_FAILED'))
    reader.readAsDataURL(file)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ImageError('IMAGE_DECODE_FAILED'))
    img.src = src
  })

/** Scale so the longest edge is at most `maxDim`; never enlarge. */
export function targetSize(width, height, maxDim) {
  const longest = Math.max(width, height)
  if (!longest || longest <= maxDim) return { width, height }
  const scale = maxDim / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Encode the canvas, preferring WebP.
 *
 * `toDataURL('image/webp')` does not throw where WebP encoding is unsupported
 * (older iOS Safari) — it silently returns a PNG, and a PNG of a photograph is
 * routinely larger than the JPEG it came from. So the result is checked by its
 * prefix rather than trusted.
 */
function encode(canvas, { allowLossy, quality }) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  return allowLossy ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png')
}

/**
 * Read one file and return a downscaled data URL.
 *
 * SVG is passed through untouched: it is already tiny, and rasterising a vector
 * logo onto a fixed-size canvas is a downgrade, not a saving.
 *
 * `rasterize: true` always produces an ordinary picture (WebP, JPEG or PNG),
 * SVG included — for storefront banners, which the API accepts only as raster
 * images because an SVG served from the app's own domain can run script.
 */
export async function fileToDataUrl(
  file,
  { maxDim = MAX_DIMENSION.gallery, quality = 0.9, rasterize = false } = {},
) {
  assertImageFile(file)

  const source = await readAsDataUrl(file)

  if (file.type === 'image/svg+xml' && !rasterize) {
    if (dataUrlBytes(source) > MAX_RESULT_BYTES) {
      throw new ImageError('IMAGE_TOO_LARGE', {
        limit: Math.round(MAX_RESULT_BYTES / (1024 * 1024)),
      })
    }
    return source
  }

  const img = await loadImage(source)
  // An SVG with no width/height of its own reports 0×0; give it the banner's
  // 2:1 shape at full size rather than a zero-pixel canvas.
  const { width, height } = targetSize(
    img.naturalWidth || maxDim,
    img.naturalHeight || Math.round(maxDim / 2),
    maxDim,
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return source // no 2d context: better the original than nothing
  ctx.drawImage(img, 0, 0, width, height)

  const encoded = encode(canvas, { allowLossy: !ALPHA_TYPES.has(file.type), quality })

  // Re-encoding a small image can occasionally produce a larger result than the
  // original (already-optimised PNGs especially). Keep whichever is smaller —
  // unless the original is a format `rasterize` must not hand back.
  const mayKeepSource = !rasterize || STORABLE_RASTER_TYPES.has(file.type)
  const result = mayKeepSource && dataUrlBytes(source) <= dataUrlBytes(encoded) ? source : encoded

  if (dataUrlBytes(result) > MAX_RESULT_BYTES) {
    throw new ImageError('IMAGE_TOO_LARGE', {
      limit: Math.round(MAX_RESULT_BYTES / (1024 * 1024)),
    })
  }
  return result
}

/**
 * Process several files one after another.
 *
 * Deliberately sequential. Decoding and rasterising N multi-megapixel images
 * concurrently is what runs a mid-range phone out of memory, and the gallery
 * input accepts multiple files at once.
 *
 * Returns `{ images, failed }` rather than throwing on the first bad file.
 * Selecting five photos where the third is a PDF should not discard the other
 * four — the caller adds what worked and reports what did not.
 */
export async function filesToDataUrls(files, options) {
  const images = []
  const failed = []
  for (const file of files) {
    try {
      images.push(await fileToDataUrl(file, options))
    } catch (err) {
      failed.push({ file, error: err })
    }
  }
  return { images, failed }
}
