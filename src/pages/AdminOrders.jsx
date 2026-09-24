import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import { useOrders } from '../hooks/useOrders'
import {
  currencySuffix,
  formatAmount,
  formatCurrency,
  formatDateTime,
} from '../utils/format'
import { methodLabelKey } from '../config/serviceMethods'

const METHOD_ICON = { delivery: 'send', dinein: 'store', pickup: 'cart' }

/** Compact "method · zone · fee" / "method · table N" chip for an order. */
function MethodChip({ order, t }) {
  if (!order.serviceMethod) return null
  const parts = [t(methodLabelKey(order.serviceMethod))]
  if (order.serviceMethod === 'delivery') {
    if (order.deliveryZone) parts.push(order.deliveryZone)
    if (order.deliveryFee > 0) parts.push(formatCurrency(order.deliveryFee))
  }
  if (order.serviceMethod === 'dinein' && order.tableNumber) {
    parts.push(t('public.checkout.tableLabel', { n: order.tableNumber }))
  }
  // Each part stays whole and the chip wraps between parts: in the narrow
  // first column at 1024px, one run of text broke mid-phrase.
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 rounded-xl bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      <Icon name={METHOD_ICON[order.serviceMethod] ?? 'cart'} className="h-3 w-3 shrink-0" />
      {parts.map((part, index) => (
        <span key={index} className="whitespace-nowrap">
          {index > 0 && '· '}
          {part}
        </span>
      ))}
    </span>
  )
}

const STATUS_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] ?? STATUS_STYLES.cancelled
      }`}
    >
      {t(`orders.status.${status}`, status)}
    </span>
  )
}

/**
 * A money cell for the المبلغ column.
 *
 * The number sits in its own fixed-width box, so `tabular-nums` lands every
 * digit on the same vertical rail and an order total aligns with the item
 * totals that make it up. The unit rides outside that box, which is what keeps
 * it still: printed inline it moves with the digit count, so 20,800 and 1,300
 * placed their د.ع in different places. `min-w` rather than `w` so an
 * unexpectedly large figure grows the box instead of colliding with the unit.
 */
function Amount({ value, strong = false }) {
  return (
    <bdi dir="ltr" className="inline-flex items-baseline gap-1.5 whitespace-nowrap" title={`${formatAmount(value)} ${currencySuffix()}`}>
      <span
        className={`tabular-nums ${
          strong ? 'font-medium text-slate-900' : 'text-slate-700'
        }`}
      >
        {formatAmount(value)}
      </span>
      <span className="text-xs font-normal text-slate-500">{currencySuffix()}</span>
    </bdi>
  )
}

export default function AdminOrders() {
  const { data: orders, loading, error } = useOrders()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        subtitle={
          loading
            ? t('orders.subtitleLoading')
            : t('orders.subtitle', { count: orders.length })
        }
      />

      <div>
        {loading && (
          <div className="p-8 text-center text-sm text-slate-500">
            {t('orders.subtitleLoading')}
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-sm text-red-600">
            {t('orders.loadFailed')}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              {t('orders.empty')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t('orders.emptyHint')}
            </p>
          </div>
        )}

        {/* Phone: each order as a tappable, expandable card. */}
        {!loading && !error && orders.length > 0 && (
          <ul className="space-y-2.5 lg:hidden">
            {orders.map((o) => {
              const isOpen = expanded.has(o.id)
              const count = o.items?.length ?? 0
              return (
                <li key={o.id} className="luxury-glass luxury-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-start"
                  >
                    <Icon
                      name="chevronDown"
                      className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">#{o.id}</span>
                        <Amount value={o.total} strong />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-slate-600">{o.restaurant}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(o.createdAt)}</p>
                      {o.serviceMethod && (
                        <div className="mt-1.5">
                          <MethodChip order={o} t={t} />
                        </div>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-3 ps-11 dark:border-white/10 dark:bg-white/5">
                      {count === 0 ? (
                        <p className="py-2 text-sm text-slate-500">{t('orders.noItems')}</p>
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-white/5">
                          {o.items.map((it, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                              <span className="min-w-0 text-slate-700">
                                <span className="font-medium tabular-nums text-slate-900">{it.quantity} ×</span>{' '}
                                {it.productName}
                              </span>
                              <Amount value={it.unitPrice * it.quantity} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="hidden overflow-x-auto lg:block">
            <div className="min-w-[64rem]">
              {/* Column labels above the cards. */}
              <div className="grid grid-cols-[1.5fr_2fr_0.7fr_1fr_1fr_1.4fr] items-center gap-4 px-6 pb-2 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>{t('orders.cols.order')}</span>
                <span>{t('orders.cols.restaurant')}</span>
                <span>{t('orders.cols.items')}</span>
                <span>{t('orders.cols.amount')}</span>
                <span>{t('orders.cols.status')}</span>
                <span>{t('orders.cols.placed')}</span>
              </div>

              {/* Each order as an expandable luxury card. */}
              <ul className="space-y-3">
                {orders.map((o) => {
                  const isOpen = expanded.has(o.id)
                  const count = o.items?.length ?? 0
                  return (
                    <li key={o.id} className="luxury-glass luxury-card overflow-hidden rounded-3xl border border-slate-200/80">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggle(o.id)}
                        className="group grid w-full grid-cols-[1.5fr_2fr_0.7fr_1fr_1fr_1.4fr] items-center gap-4 px-6 py-4 text-start text-sm"
                      >
                        <div className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <Icon
                              name="chevronDown"
                              className={`h-4 w-4 shrink-0 rounded-full bg-slate-100 p-0.5 text-slate-500 transition-all group-hover:bg-amber-50 group-hover:text-amber-600 dark:bg-white/5 dark:group-hover:bg-amber-400/10 dark:group-hover:text-amber-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                            #{o.id}
                          </span>
                          {o.serviceMethod && (
                            <div className="ms-6 mt-1">
                              <MethodChip order={o} t={t} />
                            </div>
                          )}
                        </div>
                        <div className="truncate font-medium text-slate-700 dark:text-slate-200">{o.restaurant}</div>
                        <div className="tabular-nums text-slate-500">{count || '—'}</div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5"><Amount value={o.total} strong /></div>
                        <div><StatusBadge status={o.status} /></div>
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 xl:text-sm"><Icon name="clock" className="h-4 w-4 shrink-0 text-slate-400" />{formatDateTime(o.createdAt)}</div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4 dark:border-white/10 dark:bg-white/[.03]">
                          {count === 0 ? (
                            <p className="text-sm text-slate-500">{t('orders.noItems')}</p>
                          ) : (
                            <ul className="overflow-hidden rounded-2xl border border-slate-100 bg-white/45 divide-y divide-slate-100 dark:border-white/10 dark:bg-white/[.03] dark:divide-white/5">
                              {o.items.map((it, i) => (
                                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                  <span className="min-w-0 text-slate-700 dark:text-slate-200">
                                    <span className="font-medium tabular-nums text-slate-900 dark:text-white">{it.quantity} ×</span>{' '}
                                    {it.productName}
                                    {it.quantity > 1 && (
                                      <span className="ms-2 text-xs tabular-nums text-slate-500">
                                        {t('orders.each', { price: formatCurrency(it.unitPrice) })}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 tabular-nums">
                                    <Amount value={it.unitPrice * it.quantity} />
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
