const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }

const STAR_POINTS =
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

/**
 * Displays a 0–5 star rating. Renders five stars, filling `Math.round(value)`
 * of them. Uses its own SVG (rather than <Icon>) so filled vs. empty stars can
 * be styled independently.
 */
export default function StarRating({ value = 0, size = 'md' }) {
  const filled = Math.round(value)
  const dimension = SIZES[size] ?? SIZES.md

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${dimension} ${
            i < filled ? 'text-amber-400' : 'text-slate-200'
          }`}
          fill="currentColor"
          aria-hidden="true"
        >
          <polygon points={STAR_POINTS} />
        </svg>
      ))}
    </div>
  )
}
