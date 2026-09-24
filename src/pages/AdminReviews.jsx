import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import Select from '../components/ui/Select'
import StatCard from '../components/ui/StatCard'
import StarRating from '../components/reviews/StarRating'
import { useAdminReviews } from '../hooks/useAdminReviews'
import { adminReviewsService } from '../services/adminReviewsService'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { translateApiError } from '../utils/apiError'
import { formatDate } from '../utils/format'

export default function AdminReviews() {
  const { t } = useTranslation()
  const { data: reviews, setData, loading, error } = useAdminReviews()

  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [rating, setRating] = useState(null) // null = all
  const [merchantId, setMerchantId] = useState('all')

  const openDelete = (review) => {
    setDeleteError(null) // a stale message must not greet the next attempt
    setToDelete(review)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await adminReviewsService.remove(toDelete.id)
      setData((prev) => prev.filter((r) => r.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      setDeleteError(translateApiError(err, t))
      throw err // keep ConfirmDialog from showing its success toast
    } finally {
      setDeleting(false)
    }
  }

  // Unique restaurants that have reviews, for the filter dropdown.
  const merchants = useMemo(() => {
    const map = new Map()
    for (const r of reviews) map.set(r.merchantId, r.merchantName)
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [reviews])

  const summary = useMemo(() => {
    const total = reviews.length
    const average = total
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0
    return { total, average }
  }, [reviews])

  const visible = reviews.filter(
    (r) =>
      (rating ? r.rating === rating : true) &&
      (merchantId !== 'all' ? String(r.merchantId) === String(merchantId) : true),
  )

  return (
    <div>
      <PageHeader
        title={t('adminReviews.title')}
        subtitle={t('adminReviews.subtitle')}
      />

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('adminReviews.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('adminReviews.loadFailed')}
        </div>
      )}

      {!loading && !error && summary.total === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="star" className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">
            {t('adminReviews.empty')}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t('adminReviews.emptyHint')}
          </p>
        </div>
      )}

      {!loading && !error && summary.total > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label={t('adminReviews.totalReviews')}
              value={summary.total.toLocaleString()}
              icon="star"
            />
            <div className="luxury-glass luxury-card rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {t('adminReviews.averageRating')}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      {summary.average.toFixed(1)}
                    </span>
                    <StarRating value={summary.average} size="md" />
                  </div>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                  <Icon name="star" className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          {/* Filters — on phones the picker takes its own row so the rating
              chips stay together on one line instead of wrapping around it. */}
          <div className="mt-6 space-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
            <div className="w-full sm:w-56">
              <Select
                value={merchantId}
                onChange={(v) => setMerchantId(v)}
                className="shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
                options={[
                  { value: 'all', label: t('adminReviews.allRestaurants') },
                  ...merchants.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active={rating === null} onClick={() => setRating(null)}>
                {t('adminReviews.all')}
              </FilterChip>
              {[5, 4, 3, 2, 1].map((star) => (
                <FilterChip
                  key={star}
                  active={rating === star}
                  onClick={() => setRating(star)}
                >
                  {star}
                  <Icon name="star" className="h-3.5 w-3.5" />
                </FilterChip>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {visible.map((review) => (
              <article
                key={review.id}
                className="luxury-glass luxury-card rounded-3xl p-5"
              >
                {/* Store, date and delete move under the reviewer below 420px:
                    beside them a phone left the reviewer's name ~60px. */}
                <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                      {initialsOf(review.customerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words font-semibold text-slate-900 dark:text-white">
                        {review.customerName}
                      </p>
                      <StarRating value={review.rating} size="sm" />
                    </div>
                  </div>
                  {/* Beside the reviewer (420px and up) it is capped at half the
                      row, so a long store name can't take the name's width. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 min-[420px]:block min-[420px]:max-w-[50%] min-[420px]:shrink-0 min-[420px]:text-end">
                    <Link
                      to={`/r/${review.merchantId}`}
                      target="_blank"
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
                    >
                      <Icon name="store" className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{review.merchantName}</span>
                    </Link>
                    <time className="block text-xs text-slate-400 min-[420px]:mt-1.5">
                      {formatDate(review.date)}
                    </time>
                    {/* Super Admin only. Merchants get no delete route: the
                        storefront rating is computed from these rows, so a
                        merchant able to remove them could curate their own
                        public rating. */}
                    <button
                      type="button"
                      onClick={() => openDelete(review)}
                      aria-label={t('adminReviews.deleteAria', { name: review.customerName })}
                      title={t('common.delete')}
                      className="ms-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 min-[420px]:ms-0 min-[420px]:mt-1.5 dark:hover:bg-red-500/10"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {review.comment && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-300">
                    {review.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('adminReviews.deleteTitle')}
        message={t('adminReviews.deleteConfirm', { name: toDelete?.customerName })}
        confirmLabel={t('common.delete')}
        loadingLabel={t('common.deleting')}
        destructive
        icon="trash"
        successMessage={t('common.deletedSuccess')}
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteError(null)
          setToDelete(null)
        }}
      />
    </div>
  )
}

// Up to two initials from the customer's name for the review avatar.
function initialsOf(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((w) => w[0]).join('').toUpperCase() || '★'
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? 'bg-brand-600 text-white shadow-brand-600/30'
          : 'border border-slate-200/70 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
