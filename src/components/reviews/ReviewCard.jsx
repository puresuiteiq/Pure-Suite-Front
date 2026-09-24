import StarRating from './StarRating'
import { formatDate } from '../../utils/format'

// Deterministic avatar tint from the customer's name (no randomness needed).
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
]

function avatarColor(name) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

/**
 * A single customer review: avatar, name, rating, date and comment.
 */
export default function ReviewCard({ review }) {
  const initial = review.customerName.charAt(0).toUpperCase()

  return (
    <article className="luxury-glass luxury-card rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
            review.customerName,
          )}`}
        >
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">{review.customerName}</p>
            <time className="text-xs text-slate-400">
              {formatDate(review.date)}
            </time>
          </div>
          <div className="mt-1">
            <StarRating value={review.rating} size="sm" />
          </div>
        </div>
      </div>

      <p className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {review.comment}
      </p>
    </article>
  )
}
