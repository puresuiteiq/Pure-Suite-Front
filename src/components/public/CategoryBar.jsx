import { motion, useReducedMotion } from 'framer-motion'
import { ImageOff } from 'lucide-react'
import { focusPosition } from '../../utils/coverFocus'

/**
 * Touch-friendly, horizontally scrollable menu categories — per the client's
 * reference: a photo tile per category (not a text pill with a small
 * thumbnail), the name overlaid at the tile's own bottom edge via a gradient
 * scrim, scrolling horizontally when there are more than fit on screen.
 *
 * No colour-coded active state (no ring/glow) — every tile shares the same
 * plain frame, and the current category is conveyed elsewhere (e.g. the
 * page having scrolled to that section) rather than by tinting the tile.
 *
 * Not sticky (was `sticky top-0`): the client wanted this bar to scroll away
 * with the rest of the page on scroll-down, not stay pinned at the top.
 */
export default function CategoryBar({ categories, activeId, onSelect }) {
  const reduceMotion = useReducedMotion()

  return (
    <nav className="public-category-nav border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:bg-slate-950/80">
      <div className="scrollbar-hide mx-auto flex max-w-6xl gap-3 overflow-x-auto px-4 py-3 sm:px-6">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              aria-current={active ? 'true' : undefined}
              className="group relative isolate h-28 w-28 shrink-0 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 sm:h-32 sm:w-32"
            >
              {category.image ? (
                <img loading="lazy" decoding="async"
                  src={category.image}
                  alt=""
                  style={{ objectPosition: focusPosition(category.imageFocus) }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <ImageOff className="h-6 w-6 text-slate-400" />
                </div>
              )}

              {/* Name scrim — only at the tile's own bottom edge, not a wash
                  over the whole photo, so the picture stays legible. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/25 to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 text-center text-xs font-bold leading-tight text-white sm:text-sm">
                {category.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
