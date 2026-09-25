import Price from './Price'
import Icon from '../ui/Icon'
import { useVerticalT } from '../../hooks/useVerticalT'
import { focusPosition } from '../../utils/coverFocus'

/**
 * Product tile: photo on top, info panel below it — per the client's
 * reference (a competitor app's card: framed photo with a light outlined "+"
 * in its corner, then name/description/price stacked underneath on the
 * card's own tinted surface). Replaces an earlier version that overlaid
 * name+price directly on the photo via a bottom gradient; that read as
 * "wrong design" next to the reference screenshot, which keeps the photo
 * clean and puts the text on the card body instead.
 *
 * Two sibling buttons, not one wrapping the other (a button can't nest a
 * button): a full-bleed button opens the detail sheet, and a corner "+"
 * quick-adds to the cart. The image layer is `pointer-events-none` so taps
 * fall through to the full-bleed button beneath.
 *
 * The card fill is a translucent white veil (bg-white/N, dark:bg-slate-900/N)
 * rather than a tinted mix of --storefront-background. A prior pass mixed the
 * merchant colour toward transparent so the page's own glow would show
 * through — technically "blended", but a *coloured* translucent layer over an
 * already-purple patch of that glow only adds more purple, so cards over the
 * page's more saturated spots came out darker/heavier than the page, the
 * opposite of the reference (a card lighter than its surroundings everywhere,
 * regardless of what's behind it). A translucent *white* veil always lightens
 * whatever's beneath it, so the card reliably floats and reads brighter than
 * the page no matter where it sits — while staying non-opaque so a hint of
 * the page's colour still comes through instead of a flat solid white block.
 * Kept fairly low-alpha (35%, no backdrop-blur) rather than the 60%+blur an
 * earlier pass used — the blur in particular made even a translucent fill
 * read as a frosted, fairly solid-looking pane instead of an airy tint.
 * The border (color-mix of --merchant-primary, index.css) is what gives this
 * now much lighter card its edge instead of relying on the fill for that.
 *
 * `onQuickAdd(item)` handles the add — for a product with sizes it opens the
 * sheet to choose one rather than guessing; the parent owns that rule.
 */
export default function PublicItemCard({ item, onOpen, onQuickAdd }) {
  const { t } = useVerticalT()
  const cover = (Array.isArray(item.images) && item.images[0]) || item.image
  // Merchant-set availability, plus stock=0 counting as sold out for stores.
  const unavailable = item.availability === 'unavailable'
  const soldOut = item.availability === 'out_of_stock' || (item.stock != null && Number(item.stock) <= 0)
  const blocked = unavailable || soldOut
  // Unlike the old design, the badge only appears for a state worth
  // interrupting the photo for (sold out / unavailable) — the reference has
  // no badge at all on a normal, orderable item, so a plain "Available" pill
  // would just be noise next to it.
  const status = unavailable
    ? { label: t('public.unavailable'), className: 'bg-red-600/90' }
    : soldOut
      ? { label: t('public.outOfStock'), className: 'bg-amber-500/95' }
      : null
  // Discount: only when the "was" price is above the current price.
  const originalPrice = item.originalPrice != null ? Number(item.originalPrice) : null
  const hasDiscount = originalPrice != null && originalPrice > Number(item.price)
  const discountPct = hasDiscount ? Math.round((1 - Number(item.price) / originalPrice) * 100) : 0
  return (
    <div className="public-product-card luxury-card group relative flex w-full flex-col overflow-hidden rounded-3xl border bg-white/35 dark:bg-slate-900/30">
      {/* Full-bleed open target (sits beneath the visual layer, covers the
          whole card so tapping the info panel opens the sheet too). */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={item.name}
        className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--merchant-primary)]"
      />

      {/* Photo — inset with its own rounded corners and a fixed 4:3 frame
          (not full-bleed square), so the card's tinted background shows as a
          margin around it, matching the reference's "framed photo" look. */}
      <div className="pointer-events-none relative m-2 aspect-[4/3] overflow-hidden rounded-2xl">
        {cover ? (
          <img loading="lazy" decoding="async" src={cover} alt="" style={{ objectPosition: focusPosition(item.coverFocus, '50% 0%') }} className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110 ${blocked ? 'opacity-60 grayscale' : ''}`} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><Icon name="image" className="h-10 w-10 text-slate-300" /></div>
        )}

        {/* Availability badge — only for sold-out/unavailable; see `status`. */}
        {status && (
          <span className={`absolute start-2.5 top-2.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${status.className}`}>
            {status.label}
          </span>
        )}

        {/* Discount badge — below availability when both apply. */}
        {hasDiscount && (
          <span className={`absolute start-2.5 rounded-full bg-red-600/95 px-2 py-0.5 text-[11px] font-bold text-white ${status ? 'top-9' : 'top-2.5'}`}>
            {/* dir on the text, not the badge: on the badge it would also flip
                which corner `start` means. In RTL "-20%" otherwise reads "20%-". */}
            <bdi dir="ltr">-{discountPct}%</bdi>
          </span>
        )}
      </div>

      {/* Quick-add — a light outlined circle in the photo's corner (matching
          the reference), not a solid filled one: a white disc with the
          merchant's own colour for the ring and icon. Above the open target;
          hidden when the item can't be ordered. */}
      {!blocked && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onQuickAdd?.(item)
          }}
          aria-label={t('public.quickAdd', { name: item.name })}
          className="accent-text absolute end-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-[var(--merchant-primary)] backdrop-blur transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 dark:bg-slate-900"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
      )}

      {/* Info panel — name, then description, then price, on the card's own
          tinted surface below the photo. gap-1.5 (was gap-0.5): the name grew
          bolder/bigger, and the old tight gap made it crowd the description
          right under it. */}
      <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
        {item.brand && <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.brand}</p>}
        {/* Two lines, not one: an Arabic dish name is routinely longer than a
            half-width card on a phone, and one line cut it down to its first
            word or two. */}
        <h4 className="line-clamp-2 text-sm font-extrabold leading-snug tracking-tight text-slate-900 min-[380px]:text-base dark:text-white">{item.name}</h4>
        {item.description && (
          <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
        )}
        {/* flex-wrap: on a 320px phone the card is ~140px wide, and a
            discounted price plus its struck-through original didn't fit side
            by side — the original was cut off. It now drops under instead. */}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Price value={item.price} currency={item.currency} className="price-text text-sm font-extrabold tabular-nums" />
          {hasDiscount && (
            <Price value={originalPrice} currency={item.currency} className="text-xs font-medium text-slate-400 line-through tabular-nums" />
          )}
        </div>
      </div>
    </div>
  )
}
