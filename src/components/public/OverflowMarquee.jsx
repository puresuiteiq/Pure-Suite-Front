import { useCallback, useEffect, useRef, useState } from 'react'
import Marquee from 'react-fast-marquee'
import { useTranslation } from 'react-i18next'
import { directionFor } from '../../i18n/languages'

/**
 * Scrolls its children horizontally, but only while they are too wide to fit.
 *
 * Content that already fits is left completely alone — a marquee running on a
 * short name reads as a glitch, and the storefront header fits comfortably on
 * a desktop while overflowing on a narrow phone. That makes this responsive by
 * measurement rather than by breakpoint, so it also handles the cases a
 * breakpoint can't guess: a very long business name on desktop, or a short one
 * on mobile.
 *
 * An invisible natural-width copy of the children stays in the DOM purely to
 * measure against the visible box. It's needed because the scrolling copy is
 * duplicated and transformed by the library, so its own width can't answer
 * "would this fit if it weren't scrolling?" — which is what we have to re-ask
 * on every resize. `invisible` (visibility: hidden) keeps layout, so it still
 * measures, while staying out of the tab order and the accessibility tree.
 */
export default function OverflowMarquee({ children, speed = 25, className = '' }) {
  const viewport = useRef(null)
  const natural = useRef(null)
  const [overflowing, setOverflowing] = useState(false)
  const { i18n } = useTranslation()

  // Scroll toward the side the language reads from: an Arabic line begins at
  // the right and continues leftward, so it has to travel right to reveal.
  const direction = directionFor(i18n.language) === 'rtl' ? 'right' : 'left'

  const measure = useCallback(() => {
    const box = viewport.current
    const copy = natural.current
    if (!box || !copy) return
    // 1px of slack so sub-pixel layout widths can't start a pointless scroll.
    setOverflowing(copy.scrollWidth > box.clientWidth + 1)
  }, [])

  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (viewport.current) observer.observe(viewport.current)
    if (natural.current) observer.observe(natural.current)
    return () => observer.disconnect()
  }, [measure, children])

  return (
    <div ref={viewport} className={`relative overflow-hidden ${className}`}>
      <div
        ref={natural}
        aria-hidden="true"
        className="invisible absolute start-0 top-0 w-max"
      >
        {children}
      </div>

      {overflowing ? (
        <>
          {/* The library repeats its children to loop seamlessly, so the moving
              copies are decorative and the static one below carries the text
              (and the real phone link) for screen readers. */}
          <Marquee
            speed={speed}
            direction={direction}
            gradient={false}
            pauseOnHover
            aria-hidden="true"
          >
            {/* Trailing gap so the tail doesn't butt against the head. */}
            <div className="pe-16">{children}</div>
          </Marquee>
          <div className="sr-only">{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  )
}
