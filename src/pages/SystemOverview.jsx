import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Icon from '../components/ui/Icon'
import ServiceFormModal from '../components/admin/ServiceFormModal'
import { currencySuffix } from '../utils/format'
import { useSystemOverview } from '../hooks/useSystemOverview'
import { useServices } from '../hooks/useServices'
import { servicesService } from '../services/servicesService'
import { translateApiError } from '../utils/apiError'

// Recharts is heavy (~d3 deps); load it only when this page renders so it
// stays out of the initial bundle.
const OrdersChart = lazy(() => import('../components/admin/OrdersChart'))

const chartSkeleton = (
  <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
)

// Drill-down targets: clicking a KPI opens the page that explains that number.
// MRR points at /revenue, not /merchants: the figure is derived from merchant
// plans, but the merchants list shows no money, so it left the number
// unexplained — and sent two different KPIs to the same page.
const STAT_LINKS = {
  merchants: '/merchants',
  orders: '/orders',
  mrr: '/revenue',
  reviews: '/reviews',
}

// Admin destinations that have no KPI card of their own, so the hub-and-spoke
// overview would otherwise leave them unreachable (there's no sidebar). Each
// renders as a clickable card in the "Manage" row.
const MANAGE_LINKS = [
  { key: 'plans', to: '/plans', icon: 'star' },
  { key: 'subscriptions', to: '/subscriptions', icon: 'user' },
  { key: 'admins', to: '/admins', icon: 'user' },
  { key: 'appearance', to: '/appearance', icon: 'droplet' },
]

// status key -> dot / badge / progress-bar colors. The label text comes from
// i18n so status is never conveyed by color alone (an icon-free badge still
// carries the word).
const SERVICE_STATUS = {
  operational: {
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  degraded: {
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  down: {
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  },
}

export default function SystemOverview() {
  const { data, loading, error } = useSystemOverview()
  const { t } = useTranslation()

  // Simple, page-local scroll memory: save window.scrollY as the user
  // scrolls, restore it on mount (covers Back navigation into this page).
  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard_scroll')
    if (saved != null) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' })
    }

    const onScroll = () => {
      sessionStorage.setItem('dashboard_scroll', String(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div>
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle')}
      />

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('overview.loadFailed')}
        </div>
      )}

      {!error && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading || !data
              ? Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)
              : // `key` is taken out before the spread: React 19 warns when a
                // props object carrying `key` is spread into JSX.
                data.stats.map(({ key: statKey, ...stat }) => (
                  <StatCard
                    key={statKey}
                    {...stat}
                    // Append the dinar unit in the viewer's language (IQD / د.ع)
                    // for currency stats like MRR; the backend sends just the
                    // number so the suffix isn't stuck in one language.
                    value={
                      stat.unit === 'currency'
                        ? `${stat.value} ${currencySuffix()}`
                        : stat.value
                    }
                    to={STAT_LINKS[statKey]}
                    label={t(`overview.stats.${statKey}`)}
                  />
                ))}
          </div>

          {/* Manage — links to admin pages that have no KPI card of their own */}
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('overview.manage.title')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {MANAGE_LINKS.map((link) => (
                <ManageCard
                  key={link.key}
                  to={link.to}
                  icon={link.icon}
                  title={t(`overview.manage.${link.key}Title`)}
                  hint={t(`overview.manage.${link.key}Hint`)}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Orders chart */}
            <div className="luxury-glass luxury-card rounded-3xl p-5 lg:col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  {t('overview.ordersChart')}
                </h2>
                <span className="text-xs text-slate-400">
                  {t('overview.platformWide')}
                </span>
              </div>
              {loading || !data ? (
                chartSkeleton
              ) : (
                <Suspense fallback={chartSkeleton}>
                  <OrdersChart data={data.ordersTrend} />
                </Suspense>
              )}
            </div>

            {/* Service status — admin-managed */}
            <ServiceStatusPanel />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Service Status board. Entries are maintained by the Super Admin (add / edit /
 * remove) — real, hand-entered values, not auto-measured mock numbers.
 */
function ServiceStatusPanel() {
  const { t } = useTranslation()
  const { data: services, setData, loading, error } = useServices()

  const [formOpen, setFormOpen] = useState(false)
  const [toEdit, setToEdit] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setToEdit(null)
    setFormOpen(true)
  }
  const openEdit = (svc) => {
    setToEdit(svc)
    setFormOpen(true)
  }

  const handleSubmit = async (payload) => {
    if (toEdit) {
      const updated = await servicesService.update(toEdit.id, payload)
      setData((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } else {
      const created = await servicesService.create(payload)
      setData((prev) => [...prev, created])
    }
  }

  const confirmDelete = async () => {
    setDeleteError(null)
    if (!toDelete) return
    setDeleting(true)
    try {
      await servicesService.remove(toDelete.id)
      setData((prev) => prev.filter((s) => s.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      setDeleteError(translateApiError(err, t))
      throw err
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="luxury-glass luxury-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('overview.serviceStatus')}
        </h2>
        <Button size="sm" variant="secondary" icon="plus" onClick={openCreate}>
          {t('overview.services.add')}
        </Button>
      </div>

      {loading && (
        <ul className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-6 animate-pulse rounded bg-slate-100" />
          ))}
        </ul>
      )}

      {error && (
        <p className="py-6 text-center text-sm text-red-600">
          {t('overview.services.loadFailed')}
        </p>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-slate-900">
            {t('overview.services.empty')}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t('overview.services.emptyHint')}
          </p>
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <ul className="space-y-2">
          {services.map((svc) => {
            const s = SERVICE_STATUS[svc.status] ?? SERVICE_STATUS.operational
            const uptime = Math.max(0, Math.min(100, Number(svc.uptime) || 0))
            return (
              <li
                key={svc.id}
                className="group rounded-xl border border-slate-200/70 bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10"
              >
                <div className="flex items-center gap-2.5">
                  {/* Live status dot with a soft pulsing halo. */}
                  <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping ${s.dot}`}
                    />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                    {svc.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}
                  >
                    {t(`overview.status.${svc.status}`)}
                  </span>
                  {/* Hidden until hover only where hovering exists. On a phone
                      there is no hover, so edit/delete were invisible — while
                      still taking the width the service name needed. */}
                  <span className="flex shrink-0 items-center gap-0.5 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                    <button
                      type="button"
                      onClick={() => openEdit(svc)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
                      aria-label={t('overview.services.editAria', { name: svc.name })}
                    >
                      <Icon name="pencil" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(svc)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label={t('overview.services.deleteAria', { name: svc.name })}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>

                {/* Uptime bar + figure. */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${s.bar}`}
                      style={{ width: `${uptime}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                    {uptime.toFixed(2)}%
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ServiceFormModal
        open={formOpen}
        service={toEdit}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('overview.services.deleteTitle')}
        message={t('overview.services.deleteConfirm', { name: toDelete?.name })}
        confirmLabel={t('common.remove')}
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

/**
 * Clickable navigation tile for the "Manage" row. Mirrors StatCard's hover
 * affordances (pointer, lift, icon grow) so the two card rows read as one
 * family — but carries a label + hint instead of a number.
 */
function ManageCard({ to, icon, title, hint }) {
  return (
    <Link
      to={to}
      className="luxury-glass luxury-card group flex items-center gap-4 rounded-3xl p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700 transition-all duration-300 group-hover:scale-110 dark:bg-amber-400/15 dark:text-amber-300">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{hint}</p>
      </div>
      <Icon
        name="arrowLeft"
        className="ms-auto h-4 w-4 shrink-0 rotate-180 text-slate-300 transition-all duration-300 group-hover:text-amber-500 rtl:rotate-0"
      />
    </Link>
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded bg-slate-100" />
    </div>
  )
}
