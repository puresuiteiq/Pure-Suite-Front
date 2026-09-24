/**
 * Consistent page title block. `actions` renders buttons on the right.
 *
 * A bottom border plus an accent bar next to the title give it a clearer
 * "section" boundary than bare floating text — the accent bar uses
 * `bg-brand-600`, which the merchant-brand override in index.css
 * ([data-merchant-brand] .bg-brand-600) already swaps to the merchant's own
 * panel colour, so it stays on-brand on merchant pages and platform blue on
 * Super Admin pages with no extra work here.
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1.5 h-7 w-1.5 shrink-0 rounded-full bg-brand-600 sm:mt-2" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
