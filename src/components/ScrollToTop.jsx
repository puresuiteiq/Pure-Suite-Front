import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { disableNativeScrollRestoration, readPosition, restoreScroll, writePosition } from '../utils/scrollRestoration'

disableNativeScrollRestoration()

/**
 * Window-level scroll restoration for a classic <BrowserRouter> setup —
 * covers every route except the Super Admin dashboard home, which keeps its
 * own simpler, page-local sessionStorage scroll memory (see
 * pages/SystemOverview.jsx). See utils/scrollRestoration.js for the shared
 * mechanics and the full write-up of why a one-shot / fixed-delay /
 * browser-native restore isn't enough in an SPA.
 *
 * Mount this once, near the top of the router tree (sibling to <Routes>) —
 * see App.jsx.
 */
export default function ScrollToTop() {
  const location = useLocation()
  const navigationType = useNavigationType()

  // Continuously record the *current* entry's scroll position while it's
  // active, rAF-throttled so a fast scroll gesture doesn't spam
  // sessionStorage writes on every fired scroll event — plus one final,
  // unthrottled write on cleanup so the very last pixel of movement before
  // navigating away is never lost to a pending, not-yet-fired rAF frame.
  useEffect(() => {
    const key = location.key
    let frame = null
    const onScroll = () => {
      if (frame != null) return
      frame = requestAnimationFrame(() => {
        writePosition(key, window.scrollY)
        frame = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame != null) cancelAnimationFrame(frame)
      writePosition(key, window.scrollY)
    }
  }, [location.key])

  // Apply the right scroll position for the entry we've just navigated to.
  // useLayoutEffect (not useEffect) so the first application runs before the
  // browser paints the new route, avoiding a visible flash at the wrong
  // scroll offset.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0)
      return undefined
    }
    return restoreScroll(readPosition(location.key), {
      set: (y) => window.scrollTo(0, y),
      watchEl: document.documentElement,
    })
  }, [location.key, navigationType])

  return null
}
