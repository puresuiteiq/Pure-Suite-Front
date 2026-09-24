/**
 * Shared primitives behind window-level scroll restoration, used by
 * `ScrollToTop` (components/ScrollToTop.jsx) for routes that scroll the
 * document itself (Login, the public storefront).
 *
 * `disableNativeScrollRestoration()` is called once (idempotent) — left at
 * its default, the *browser's own* native scroll restoration also acts on
 * every Back/Forward with no guaranteed order against this module's, and can
 * silently undo a correct restore right after this module applies it.
 *
 * The Super Admin dashboard home keeps its own separate, simpler,
 * page-local sessionStorage scroll memory instead of these primitives — see
 * pages/SystemOverview.jsx.
 */

const STORAGE_PREFIX = 'scroll-restoration:'

// In-memory L1 cache in front of sessionStorage: reads/writes on every scroll
// event go here first (sessionStorage access is comparatively slow and, for
// Safari in particular, can throw under storage pressure), with
// sessionStorage as the durable L2 so positions survive a full page reload —
// an in-memory-only Map does not, since it's wiped along with the JS heap.
const memoryCache = new Map()

export function readPosition(key) {
  if (memoryCache.has(key)) return memoryCache.get(key)
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    return raw != null ? Number(raw) : 0
  } catch {
    // Private browsing / storage disabled / quota exceeded — fall back to
    // "no saved position" rather than let the read crash navigation.
    return 0
  }
}

export function writePosition(key, value) {
  memoryCache.set(key, value)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, String(value))
  } catch {
    // Same as above: the in-memory cache still works for the rest of this
    // tab's session even if persistence itself isn't available.
  }
}

let nativeRestorationDisabled = false
export function disableNativeScrollRestoration() {
  if (nativeRestorationDisabled) return
  nativeRestorationDisabled = true
  if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
}

// How long to keep re-asserting the target scroll position after the last
// detected layout change before giving up on that navigation. Reset every
// time ResizeObserver reports another change, so a page whose content keeps
// growing (paginated fetches, a slow chart library, …) keeps getting
// corrected for as long as it keeps shifting — not just for a fixed window
// from the moment of navigation.
const SETTLE_MS = 500
// Absolute ceiling regardless of ongoing resizes, so a pathologically
// long-loading or continuously-resizing page (e.g. a live-updating widget)
// can't keep this running indefinitely.
const HARD_STOP_MS = 4000

/**
 * Repeatedly re-applies `target` as `get()`'s scroll position for as long as
 * `watchEl`'s height keeps changing, instead of guessing a fixed number of
 * retries at fixed delays. `get`/`set` abstract over "window" vs. "a specific
 * scrollable element" so the same logic drives both restoration modes.
 * Returns a cleanup function.
 *
 * Layout can keep shifting after a route change for reasons that have
 * nothing to do with each other — a CSS enter animation, a data fetch that
 * resolves late, images loading in, a chart library measuring its container
 * on a second pass — so reacting to the actual DOM height rather than a
 * timer is what makes this robust to any of them, without needing to know
 * which one is in play for a given page.
 */
export function restoreScroll(target, { set, watchEl }) {
  set(target)

  if (typeof ResizeObserver === 'undefined' || !watchEl) {
    // Ancient-browser (or not-yet-mounted watchEl) fallback: no live layout
    // signal available, so just reassert once more after a beat.
    const id = window.setTimeout(() => set(target), 150)
    return () => window.clearTimeout(id)
  }

  let settleTimeoutId
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    observer.disconnect()
    window.clearTimeout(settleTimeoutId)
    window.clearTimeout(hardStopId)
  }

  const observer = new ResizeObserver(() => {
    if (stopped) return
    set(target)
    window.clearTimeout(settleTimeoutId)
    settleTimeoutId = window.setTimeout(stop, SETTLE_MS)
  })
  observer.observe(watchEl)

  const hardStopId = window.setTimeout(stop, HARD_STOP_MS)
  // In case watchEl never resizes again at all (already at full height by
  // the first paint), still stop watching after the settle window instead
  // of waiting for the hard ceiling.
  settleTimeoutId = window.setTimeout(stop, SETTLE_MS)

  return stop
}
