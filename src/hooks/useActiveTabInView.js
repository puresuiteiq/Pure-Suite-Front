import { useEffect, useRef } from 'react'

/**
 * Keep the current category's tab in view as the page scrolls.
 *
 * Scrolls only the bar, by the tab's offset from the bar's centre —
 * scrollIntoView would also nudge the page, and in Chrome that cancels the
 * smooth scroll a category tap has just started. Measured from rects, so it is
 * right in RTL too, where scrollLeft runs negative.
 */
export function useActiveTabInView(activeId) {
  const barRef = useRef(null)
  useEffect(() => {
    const bar = barRef.current
    const tab = bar?.querySelector(`[data-category-id="${activeId}"]`)
    if (!bar || !tab) return
    const barRect = bar.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    const delta = tabRect.left + tabRect.width / 2 - (barRect.left + barRect.width / 2)
    if (Math.abs(delta) > 4) bar.scrollBy({ left: delta, behavior: 'smooth' })
  }, [activeId])
  return barRef
}
