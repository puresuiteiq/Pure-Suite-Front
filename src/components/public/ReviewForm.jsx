import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import { translateApiError } from '../../utils/apiError'

const STAR_POINTS =
  '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

/**
 * Customer review form for the public storefront: name, an interactive star
 * rating, and an optional comment. Calls async `onSubmit({ customerName,
 * rating, comment })`; on success it resets and shows a thank-you.
 */
export default function ReviewForm({ onSubmit }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError(t('public.enterName'))
    if (rating < 1) return setError(t('public.pickRating'))

    setSubmitting(true)
    try {
      await onSubmit({ customerName: name.trim(), rating, comment: comment.trim() })
      setName('')
      setRating(0)
      setComment('')
      setDone(true)
    } catch (err) {
      setError(translateApiError(err, t, 'public.reviewFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
          <Icon name="check" className="h-5 w-5" />
        </span>
        <p className="mt-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          {t('public.thanks')}
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
        >
          {t('public.writeAnother')}
        </button>
      </div>
    )
  }

  const shown = hover || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Star picker — a flat pale fill on unrated stars nearly disappeared
          against a light merchant background (the same low-contrast issue the
          review summary's empty state had), so unrated stars are now outlined
          instead of filled — a shape that reads clearly on any background,
          picked or not. Each star also gets a soft accent-tinted hover
          circle, tying the interaction to the merchant's own theme colour
          while the star itself stays the universal amber once picked. */}
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-full p-1 transition-all hover:scale-110 hover:bg-[color-mix(in_srgb,var(--merchant-primary)_12%,transparent)] active:scale-95"
            aria-label={t('public.aria.stars', { count: n })}
          >
            <svg
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className={`h-8 w-8 transition-colors ${
                shown >= n
                  ? 'fill-amber-400 stroke-amber-400 drop-shadow-[0_2px_5px_rgba(251,191,36,0.4)]'
                  : 'fill-transparent stroke-slate-300 dark:stroke-slate-600'
              }`}
              aria-hidden="true"
            >
              <polygon points={STAR_POINTS} />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ms-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">{rating}/5</span>
        )}
      </div>

      {/* Inputs: a leading icon + a focus ring in the merchant's own accent
          colour (was the admin dashboard's fixed blue "brand" scale, which
          doesn't belong on a customer-facing, per-merchant-themed page). */}
      <div className="relative">
        <Icon name="user" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('public.yourName')}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-3.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 focus:border-[color:var(--merchant-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
        />
      </div>

      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('public.reviewPlaceholder')}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 focus:border-[color:var(--merchant-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
      />

      <button
        type="submit"
        disabled={submitting}
        className="btn-glow btn-glow-custom accent-surface inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="send" className="h-4 w-4" />
        {submitting ? t('public.submitting') : t('public.submitReview')}
      </button>
    </form>
  )
}
