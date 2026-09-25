/**
 * Cover framing: which part of a product photo a storefront card shows.
 *
 * Cards fill their frame with `object-fit: cover`, which crops whatever
 * doesn't fit. The merchant drags the photo in the editor to choose what stays
 * visible; that choice is a focus point — percentages from the left and top,
 * used directly as the card's `object-position`. The photo itself is never
 * cropped, so the product sheet still shows all of it.
 *
 * Import-free, so `npm test` can load it.
 */

export const CENTER = { x: 50, y: 50 }

const clamp = (n) => Math.min(100, Math.max(0, n))

/** A focus point as a CSS object-position, or `fallback` when none is set. */
export function focusPosition(focus, fallback = '50% 50%') {
  if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.y)) return fallback
  return `${clamp(focus.x)}% ${clamp(focus.y)}%`
}

/**
 * How far a photo overflows its frame under `object-fit: cover`, in pixels —
 * the distance an object-position of 0% → 100% slides it. One axis is always
 * 0: cover fills the frame exactly along the tighter side.
 */
export function coverOverflow(naturalWidth, naturalHeight, frameWidth, frameHeight) {
  if (!naturalWidth || !naturalHeight || !frameWidth || !frameHeight) return { x: 0, y: 0 }
  const scale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight)
  return {
    x: Math.max(0, naturalWidth * scale - frameWidth),
    y: Math.max(0, naturalHeight * scale - frameHeight),
  }
}

/**
 * The focus after dragging the photo by (dx, dy) pixels.
 *
 * Dragging the photo right shows more of its left side, so the percentage
 * falls. An axis with no overflow can't move, and a point never leaves 0–100.
 */
export function dragFocus(focus, dx, dy, overflow) {
  const start = focus ?? CENTER
  return {
    x: overflow.x > 0 ? Math.round(clamp(start.x - (dx / overflow.x) * 100)) : start.x,
    y: overflow.y > 0 ? Math.round(clamp(start.y - (dy / overflow.y) * 100)) : start.y,
  }
}
