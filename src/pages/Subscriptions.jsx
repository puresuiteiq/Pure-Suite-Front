import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import RenewSubscriptionModal from '../components/merchants/RenewSubscriptionModal'
import { useMerchants } from '../hooks/useMerchants'
import { usePlans } from '../hooks/usePlans'
import { merchantsService } from '../services/merchantsService'
import { formatAmount, currencySuffix, formatDate } from '../utils/format'
import { translateApiError } from '../utils/apiError'

/** Subscription status from an expiry date (YYYY-MM-DD or null). */
function statusOf(expiresAt) {
  if (!expiresAt) return { key: 'none', days: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(`${expiresAt}T00:00:00`)
  const days = Math.round((exp - today) / 86400000)
  if (days < 0) return { key: 'expired', days }
  if (days <= 7) return { key: 'expiring', days }
  return { key: 'active', days }
}

const STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  none: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

const PAGE_SIZE = 10

/**
 * Super Admin subscriptions view — every merchant with its plan, price, expiry
 * date and subscription status, newest-expiring first. Renew inline or open the
 * merchant's details.
 */
export default function Subscriptions() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const {
    data: merchants,
    setData,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
    subscriptionSummary,
  } = useMerchants({
    pageSize: PAGE_SIZE,
    subscriptionStatus: filter,
    sort: 'subscription',
    includeSubscriptionSummary: true,
  })
  const { data: plans } = usePlans()
  const loadMoreRef = useRef(null)
  const [toRenew, setToRenew] = useState(null) // merchant with the renew picker open
  const [toCancel, setToCancel] = useState(null) // merchant with the cancel confirm open
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const planByName = useMemo(
    () => new Map(plans.map((p) => [p.name, p])),
    [plans],
  )

  const summary = useMemo(() => {
    if (subscriptionSummary) return subscriptionSummary
    const s = { active: 0, expiring: 0, expired: 0 }
    for (const m of merchants) {
      const st = statusOf(m.subscriptionExpiresAt).key
      if (st === 'active') s.active += 1
      else if (st === 'expiring') s.expiring += 1
      else if (st === 'expired') s.expired += 1
    }
    return s
  }, [merchants, subscriptionSummary])

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '900px 0px' },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, loadingMore])

  // Suggested date the calendar picker opens on: the plan's billing period
  // from whichever is later, today or the current expiry — same rule the
  // one-click Renew used to apply automatically, now just a starting point.
  const suggestedExpiry = (m) => {
    const periodDays = planByName.get(m.plan)?.periodDays || 30
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const current = m.subscriptionExpiresAt ? new Date(`${m.subscriptionExpiresAt}T00:00:00`) : today
    const base = current > today ? current : today
    base.setDate(base.getDate() + periodDays)
    return base.toISOString().slice(0, 10)
  }

  const renew = async (date) => {
    const { subscriptionExpiresAt, status } = await merchantsService.renew(toRenew.id, date)
    setData((prev) =>
      prev.map((m) =>
        m.id === toRenew.id
          ? { ...m, subscriptionExpiresAt, ...(status ? { status } : {}) }
          : m,
      ),
    )
  }

  const confirmCancel = async () => {
    if (!toCancel) return
    setCancelling(true)
    setCancelError(null)
    try {
      const { subscriptionExpiresAt, status } = await merchantsService.cancelSubscription(toCancel.id)
      setData((prev) =>
        prev.map((m) =>
          m.id === toCancel.id
            ? { ...m, subscriptionExpiresAt, ...(status ? { status } : {}) }
            : m,
        ),
      )
      setToCancel(null)
    } catch (err) {
      // This one genuinely refuses: the API returns 409 when subscription
      // tracking has not been migrated in.
      setCancelError(translateApiError(err, t))
      throw err
    } finally {
      setCancelling(false)
    }
  }

  const statusLabel = (st) =>
    st.key === 'active'
      ? t('subscriptions.status.active')
      : st.key === 'expiring'
        ? t(st.days === 0 ? 'subscriptions.expiresToday' : 'subscriptions.daysLeft', { n: st.days })
        : st.key === 'expired'
          ? t('subscriptions.expiredAgo', { n: -st.days })
          : t('subscriptions.status.none')

  return (
    <div>
      <PageHeader title={t('subscriptions.title')} subtitle={t('subscriptions.subtitle')} />

      {!error && !loading && (merchants.length > 0 || total > 0 || subscriptionSummary) && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { key: 'active', value: summary.active, style: 'text-emerald-600' },
            { key: 'expiring', value: summary.expiring, style: 'text-amber-600' },
            { key: 'expired', value: summary.expired, style: 'text-red-600' },
          ].map((tile) => (
            <button
              key={tile.key}
              type="button"
              onClick={() => setFilter((current) => (current === tile.key ? '' : tile.key))}
              className={`luxury-glass luxury-card rounded-3xl p-5 text-start transition hover:-translate-y-0.5 hover:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${
                filter === tile.key ? 'border-amber-400/70 bg-amber-400/10' : ''
              }`}
            >
              <p className="text-sm font-medium text-slate-500">{t(`subscriptions.summary.${tile.key}`)}</p>
              <p className={`mt-1 text-3xl font-bold tracking-tight ${tile.style}`}>{tile.value}</p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('subscriptions.loadFailed')}
        </div>
      )}
      {!error && loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('subscriptions.loading')}
        </div>
      )}
      {!error && !loading && merchants.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Icon name="store" className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            {filter ? t('subscriptions.filteredEmpty') : t('subscriptions.empty')}
          </p>
        </div>
      )}

      {!error && !loading && merchants.length > 0 && (
        <>
          {filter && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-500">
              <span>{t('subscriptions.showingFilter', { status: t(`subscriptions.summary.${filter}`) })}</span>
              <button
                type="button"
                className="font-semibold text-amber-500 hover:text-amber-400"
                onClick={() => setFilter('')}
              >
                {t('subscriptions.showAll')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {merchants.map((m) => {
            const st = statusOf(m.subscriptionExpiresAt)
            const plan = planByName.get(m.plan)
            return (
              <article key={m.id} className="luxury-glass luxury-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-slate-900 dark:text-white">{m.name}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {t(`plans.${m.plan}`, m.plan)}
                      </span>
                    </div>
                    {plan && (
                      <p className="mt-1 text-sm text-slate-500">
                        {formatAmount(plan.price)} {currencySuffix()}
                        {' · '}
                        {plan.periodDays === 30
                          ? t('plansPage.per.monthly')
                          : plan.periodDays === 365
                            ? t('plansPage.per.yearly')
                            : t('plansPage.per.customN', { n: plan.periodDays })}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[st.key]}`}>
                    {statusLabel(st)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
                  <div className="text-sm">
                    <span className="text-slate-400">{t('subscriptions.ends')}: </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {m.subscriptionExpiresAt ? formatDate(m.subscriptionExpiresAt) : t('subscriptions.notSet')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="secondary" icon="check" onClick={() => setToRenew(m)}>
                      {t('subscriptions.renew')}
                    </Button>
                    {/* Only offered while there's an actual live subscription
                        to end — already-expired/never-tracked has nothing to
                        cancel. */}
                    {(st.key === 'active' || st.key === 'expiring') && (
                      <Button size="sm" variant="secondary" icon="close" onClick={() => (setCancelError(null), setToCancel(m))}>
                        {t('subscriptions.cancel')}
                      </Button>
                    )}
                    <Link to={`/merchants/${m.id}`} state={{ backTo: '/subscriptions' }}>
                      <Button size="sm" variant="secondary">{t('subscriptions.view')}</Button>
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
          </div>
          <div ref={loadMoreRef} className="h-8" />
          {loadingMore && (
            <div className="mt-3 text-center text-sm text-slate-500">
              {t('subscriptions.loadingMore')}
            </div>
          )}
        </>
      )}

      <RenewSubscriptionModal
        open={Boolean(toRenew)}
        merchant={toRenew}
        defaultDate={toRenew ? suggestedExpiry(toRenew) : undefined}
        onClose={() => setToRenew(null)}
        onSubmit={renew}
      />

      <ConfirmDialog
        open={Boolean(toCancel)}
        title={t('subscriptions.cancelConfirmTitle')}
        message={t('subscriptions.cancelConfirmMessage', { name: toCancel?.name })}
        confirmLabel={t('subscriptions.cancel')}
        loadingLabel={t('common.working')}
        destructive
        icon="close"
        loading={cancelling}
        error={cancelError}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </div>
  )
}
