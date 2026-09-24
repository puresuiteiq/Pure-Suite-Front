import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import { formatCurrency } from '../../utils/format'
import Price from './Price'

/**
 * The cart's scrollable body: the lines, and a few things worth adding.
 *
 * The total and the checkout button live in <CartSummary> in the modal footer,
 * so they stay pinned while this scrolls.
 *
 * Each line reads top-down as name → what it costs → what it totals. The unit
 * price is only shown once the quantity makes it differ from the line total;
 * printing "1,300 د.ع" twice on a single-quantity line is noise, not detail.
 *
 * Cards use `.cart-item-card` (index.css) — a light wash of the merchant's
 * --storefront-background, not solid white, so the drawer's own purple-tinted
 * panel (themedPanelStyle) carries through the cards instead of being covered
 * by an opaque row; still light enough to keep text/icons at full contrast.
 */
// The chosen options for a line — the priced variant plus any extra values
// (e.g. "Blue · L") — as one short string.
const itemOptions = (item) =>
  [item.variantValue, ...Object.values(item.attributes ?? {})].filter(Boolean).join(' · ')

export default function CartPanel({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  recommendations = [],
  onQuickAdd,
}) {
  const { t } = useTranslation()

  if (!items.length) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
          <Icon name="cart" className="h-6 w-6 text-slate-400" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('public.cart.empty')}
        </p>
        <p className="mt-1 text-xs text-slate-500">{t('public.cart.emptyHint')}</p>
      </div>
    )
  }

  const stepper =
    'flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'

  return (
    <div>
      {/* Count + a clear-all button. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('public.cart.items', { count: items.length })}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_2px_10px_rgba(15,23,42,0.05)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_6px_16px_rgba(239,68,68,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
          {t('public.cart.clear')}
        </button>
      </div>

      {/* Each item as its own card: name + line price on top (struck "was"
          price + % off when discounted), options + unit price, then stepper. */}
      <ul className="space-y-2.5">
        {items.map((item) => {
          const hasDiscount =
            item.originalPrice != null && Number(item.originalPrice) > Number(item.price)
          const discountPct = hasDiscount
            ? Math.round((1 - Number(item.price) / Number(item.originalPrice)) * 100)
            : 0
          return (
            <li
              key={item.id}
              className="cart-item-card flex gap-3 p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
                {item.image ? (
                  <img loading="lazy" decoding="async" src={item.image} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon name="image" className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                {/* Line total under the name below 380px: beside it, a 320px
                    phone left the name under 90px. */}
                <div className="flex flex-col gap-1 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between min-[380px]:gap-3">
                  <div className="min-w-0">
                    {/* Two lines: beside the photo and the line total, a 320px
                        phone cut even "Hummus" short. */}
                    <p className="line-clamp-2 break-words text-sm font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {itemOptions(item) && (
                        <span className="accent-text text-xs font-semibold">{itemOptions(item)}</span>
                      )}
                      {item.quantity > 1 && (
                        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                          {t('public.cart.each', { price: formatCurrency(item.price) })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-start leading-tight min-[380px]:text-end">
                    {hasDiscount && (
                      <div className="mb-0.5 flex items-center justify-start gap-1.5 min-[380px]:justify-end">
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-300">
                          -{discountPct}%
                        </span>
                        <Price value={item.originalPrice * item.quantity} className="text-[11px] text-slate-500 line-through tabular-nums dark:text-slate-400" />
                      </div>
                    )}
                    <Price value={item.price * item.quantity} className="price-text text-sm font-bold tabular-nums" />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/15">
                    <button
                      type="button"
                      onClick={() => onDecrement(item.id)}
                      className={`${stepper} rounded-s-full`}
                      aria-label={t('public.aria.removeOne', { name: item.name })}
                    >
                      <Icon name="minus" className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(item.id)}
                      className={`${stepper} rounded-e-full`}
                      aria-label={t('public.aria.addOne', { name: item.name })}
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    {t('common.remove')}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {recommendations.length > 0 && (
        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('public.cart.youMayAlsoLike')}
          </h3>
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
            {recommendations.map((product) => {
              const hasDiscount =
                product.originalPrice != null && Number(product.originalPrice) > Number(product.price)
              const discountPct = hasDiscount
                ? Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100)
                : 0
              return (
                <article
                  key={product.id}
                  className="cart-item-card w-36 shrink-0 snap-start overflow-hidden"
                >
                  <div className="relative h-24 bg-slate-100 dark:bg-white/5">
                    {product.image ? (
                      <img loading="lazy" decoding="async" src={product.image} alt="" className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon name="image" className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                    {hasDiscount && (
                      <span className="absolute start-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                        -{discountPct}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onQuickAdd(product)}
                      aria-label={t('public.aria.addOne', { name: product.name })}
                      className="accent-surface absolute bottom-2 end-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-110"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-[2lh] break-words text-xs font-semibold leading-snug text-slate-900 dark:text-white">
                      {product.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Price value={product.price} className="price-text text-xs font-bold tabular-nums" />
                      {hasDiscount && (
                        <Price value={product.originalPrice} className="text-[11px] text-slate-500 line-through tabular-nums dark:text-slate-400" />
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
