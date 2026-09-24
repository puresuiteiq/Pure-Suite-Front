import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Icon from './Icon'

/**
 * KPI tile for dashboard summaries.
 * `trend` is a signed string like "+12.5%"; positive renders green, negative red.
 * `to` (optional) makes the whole tile a link that drills into the relevant
 * page. Its affordance is the pointer cursor, the card's own hover lift and the
 * icon growing — deliberately no drill-in arrow: the whole tile is the target,
 * so an arrow tucked against one corner only implied a smaller one.
 */
export default function StatCard({ label, value, trend, icon, to }) {
  const { t } = useTranslation()
  const isNegative = typeof trend === 'string' && trend.trim().startsWith('-')
  const interactive = Boolean(to)

  const className = `luxury-glass luxury-card block rounded-3xl p-6 ${
    interactive
      ? 'group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
      : ''
  }`

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {icon && (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-700 transition-all duration-300 group-hover:scale-110 dark:bg-amber-400/15 dark:text-amber-300">
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
      {trend && (
        <p className="mt-3 text-sm">
          <span
            className={`font-medium ${
              isNegative ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {trend}
          </span>{' '}
          <span className="text-slate-400">{t('statCard.vsLastMonth')}</span>
        </p>
      )}
    </>
  )

  if (interactive) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
