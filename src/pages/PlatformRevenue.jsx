import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import { useRevenue } from '../hooks/useRevenue'
import { formatAmount, currencySuffix } from '../utils/format'

/**
 * Where the "Platform MRR" KPI on the overview comes from. The overview states
 * the figure; this page shows the arithmetic behind it — one row per plan, the
 * merchants on it, its monthly price, and the subtotal — so the total is
 * auditable rather than asserted.
 *
 * Every number is derived from live merchant records (GET /api/overview/revenue).
 * A plan nobody is on still gets a row: "0 merchants" is a real finding for a
 * platform owner, not an absence of data.
 */
export default function PlatformRevenue() {
  const { data, loading, error } = useRevenue()
  const { t } = useTranslation()

  const plans = data?.plans ?? []
  const hasRevenue = plans.some((p) => p.merchants > 0)

  return (
    <div>
      <PageHeader
        title={t('revenue.title')}
        subtitle={
          loading
            ? t('revenue.subtitleLoading')
            : t('revenue.subtitle', { count: data?.activeMerchants ?? 0 })
        }
      />

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('revenue.loadFailed')}
        </div>
      )}

      {!error && (
        <>
          {/* Headline — the same figure the overview KPI shows. */}
          <div className="luxury-glass luxury-card mb-6 rounded-3xl p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  {t('revenue.mrrLabel')}
                </p>
                {loading ? (
                  <div className="mt-3 h-9 w-48 animate-pulse rounded-lg bg-slate-200/70" />
                ) : (
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    {formatAmount(data.mrr)}{' '}
                    <span className="text-xl font-medium text-slate-400">
                      {currencySuffix()}
                    </span>
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  {t('revenue.mrrHint')}
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                <Icon name="dashboard" className="h-5 w-5" />
              </span>
            </div>
          </div>

          <div className="luxury-glass luxury-card rounded-3xl p-4 sm:p-5">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                ))}
              </div>
            )}

            {/* No active merchants at all — the platform has no MRR yet, which is
                a state worth stating plainly rather than showing a zeroed table. */}
            {!loading && !hasRevenue && (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t('revenue.empty')}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t('revenue.emptyHint')}
                </p>
              </div>
            )}

            {/* One row per plan: name + merchants/price, its subtotal, and a bar
                showing that plan's share of the MRR — turning the old empty table
                cells into an at-a-glance breakdown. Works at every width. */}
            {!loading && hasRevenue && (
              <>
                <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <span>{t('revenue.cols.plan')}</span>
                  <span>{t('revenue.cols.subtotal')}</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {plans.map((row) => {
                    const share = data.mrr > 0 ? (row.subtotal / data.mrr) * 100 : 0
                    return (
                      <div key={row.plan} className="px-2 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {row.unpriced ? row.plan : t(`plans.${row.plan}`)}
                              </span>
                              {row.unpriced && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                  {t('revenue.unpriced')}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {row.merchants} {t('revenue.cols.merchants')}
                              {!row.unpriced && ` · ${formatAmount(row.price)} ${currencySuffix()}`}
                            </p>
                          </div>
                          <div className="shrink-0 text-end">
                            <p className="font-bold tabular-nums text-slate-900 dark:text-white">
                              {formatAmount(row.subtotal)}{' '}
                              <span className="text-xs font-medium text-slate-400">{currencySuffix()}</span>
                            </p>
                            {share > 0 && (
                              <p className="text-xs tabular-nums text-slate-400">{share.toFixed(0)}%</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${share}%`, backgroundColor: 'var(--merchant-primary)' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-100/70 px-4 py-3.5 dark:bg-white/5">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{t('revenue.total')}</span>
                    <span className="text-xs text-slate-500">
                      {data.activeMerchants} {t('revenue.cols.merchants')}
                    </span>
                  </span>
                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatAmount(data.mrr)}{' '}
                    <span className="text-sm font-medium text-slate-400">{currencySuffix()}</span>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* An unpriced plan contributes nothing to MRR; say so rather than let
              the reader wonder why a row with merchants on it totals zero. */}
          {!loading && plans.some((p) => p.unpriced) && (
            <p className="mt-4 text-xs text-slate-500">
              {t('revenue.unpricedNote')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
