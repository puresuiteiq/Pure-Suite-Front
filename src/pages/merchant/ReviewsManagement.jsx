import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../components/ui/PageHeader'
import Icon from '../../components/ui/Icon'
import StarRating from '../../components/reviews/StarRating'
import ReviewCard from '../../components/reviews/ReviewCard'
import { useReviews } from '../../hooks/useReviews'
import AnimatedSection from '../../components/ui/AnimatedSection'

export default function ReviewsManagement() {
  const { t } = useTranslation()
  const { data: reviews, loading, error } = useReviews()

  const [filter, setFilter] = useState(null) // null = all, else 1–5

  const summary = useMemo(() => {
    const total = reviews.length
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let sum = 0
    for (const r of reviews) {
      counts[r.rating] = (counts[r.rating] ?? 0) + 1
      sum += r.rating
    }
    return { total, counts, average: total ? sum / total : 0 }
  }, [reviews])

  const visible = filter
    ? reviews.filter((r) => r.rating === filter)
    : reviews

  return (
    <div>
      <PageHeader
        title={t('reviews.title')}
        subtitle={
          loading
            ? t('reviews.subtitleLoading')
            : t('reviews.subtitle', { count: summary.total })
        }
      />

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('reviews.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('reviews.loadFailed')}
        </div>
      )}

      {!loading && !error && summary.total === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="star" className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">
            {t('reviews.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('reviews.emptyHint')}</p>
        </div>
      )}

      {!loading && !error && summary.total > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AnimatedSection className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-4xl font-semibold tracking-tight text-slate-900">
                {summary.average.toFixed(1)}
              </p>
              <div className="mt-2">
                <StarRating value={summary.average} size="lg" />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {t('reviews.basedOn', { count: summary.total })}
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.08} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.counts[star]
                  const pct = summary.total
                    ? (count / summary.total) * 100
                    : 0
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="flex w-10 shrink-0 items-center gap-1 text-sm text-slate-600">
                        {star}
                        <Icon
                          name="star"
                          className="h-3.5 w-3.5 text-amber-400"
                        />
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-end text-sm text-slate-500 dark:text-slate-400">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </AnimatedSection>
          </div>

          {/* Filter */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterChip
              active={filter === null}
              onClick={() => setFilter(null)}
            >
              {t('reviews.all')}
            </FilterChip>
            {[5, 4, 3, 2, 1].map((star) => (
              <FilterChip
                key={star}
                active={filter === star}
                disabled={summary.counts[star] === 0}
                onClick={() => setFilter(star)}
              >
                {star}
                <Icon name="star" className="h-3.5 w-3.5" />
                <span className="text-slate-400">({summary.counts[star]})</span>
              </FilterChip>
            ))}
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {visible.map((review, index) => (
              <AnimatedSection key={review.id} delay={index * 0.04} className="rounded-3xl">
                <ReviewCard review={review} />
              </AnimatedSection>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${
        active
          ? 'bg-brand-600 text-white shadow-brand-600/30'
          : 'border border-slate-200/70 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
