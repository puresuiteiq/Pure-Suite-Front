import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'
import Price from './Price'
import { useVerticalT } from '../../hooks/useVerticalT'
import { publicService } from '../../services/publicService'

// Common colour names (English / Arabic / Kurdish) → hex, so a "Color" option
// renders as real swatches. Unknown names fall back to a text pill.
const COLOR_HEX = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', black: '#111827', white: '#ffffff',
  gray: '#9ca3af', grey: '#9ca3af', yellow: '#eab308', purple: '#a855f7', pink: '#ec4899',
  orange: '#f97316', brown: '#92400e', beige: '#d6c7a1', navy: '#1e3a8a', gold: '#d4af37',
  silver: '#c0c0c0', teal: '#14b8a6', cyan: '#06b6d4', maroon: '#7f1d1d', dark: '#111827',
  'أحمر': '#ef4444', 'احمر': '#ef4444', 'أزرق': '#3b82f6', 'ازرق': '#3b82f6', 'أخضر': '#22c55e',
  'اخضر': '#22c55e', 'أسود': '#111827', 'اسود': '#111827', 'داكن': '#111827', 'أبيض': '#ffffff',
  'ابيض': '#ffffff', 'رمادي': '#9ca3af', 'أصفر': '#eab308', 'اصفر': '#eab308', 'بنفسجي': '#a855f7',
  'وردي': '#ec4899', 'برتقالي': '#f97316', 'بني': '#92400e', 'بيج': '#d6c7a1', 'كحلي': '#1e3a8a',
  'ذهبي': '#d4af37', 'فضي': '#c0c0c0',
  'سور': '#ef4444', 'شین': '#3b82f6', 'کەسک': '#22c55e', 'رەش': '#111827', 'سپی': '#ffffff', 'زەر': '#eab308',
}
const colorHex = (value) => {
  const raw = String(value ?? '').trim()
  return COLOR_HEX[raw.toLowerCase()] ?? COLOR_HEX[raw] ?? null
}
// A group renders as swatches when the merchant set colours on it, its name
// reads like a colour, or its values are recognised colour names.
const isColorGroup = (group) =>
  (group.colors && Object.keys(group.colors).length > 0) ||
  /لون|رنگ|رەنگ|colou?r/i.test(group.name) ||
  group.values.some((v) => colorHex(v))
// Light swatches need a dark check mark (and a hairline so white shows on white).
const isLightHex = (hex) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}

export default function ProductDetailSheet({ item, available, merchantId, onClose, onAdd }) {
  const { t } = useVerticalT()
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  // Chosen value per extra option group, e.g. { Size: 'L' }.
  const [selectedAttrs, setSelectedAttrs] = useState({})
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const galleryRef = useRef(null)

  // Animated dismiss: slide the sheet down, then actually close ~280ms later.
  // Every close path (backdrop, X, Close, Escape, add-to-cart) goes through this.
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setTimeout(onClose, 280)
  }, [onClose])
  const attributes = Array.isArray(item?.attributes) ? item.attributes : []
  const variants = Array.isArray(item?.variants) ? item.variants : []
  const selectedVariant = variants[selectedVariantIndex] ?? null
  const displayedPrice = selectedVariant ? selectedVariant.price : item?.price
  // Discount: the "was" price only counts when it's above the shown price.
  const originalPrice = item?.originalPrice != null ? Number(item.originalPrice) : null
  const hasDiscount = originalPrice != null && originalPrice > Number(displayedPrice)
  const discountPct = hasDiscount ? Math.round((1 - Number(displayedPrice) / originalPrice) * 100) : 0

  // Suitable age range (years). Shown as a chip when either bound is set.
  const ageMin = item?.ageMin ?? null
  const ageMax = item?.ageMax ?? null
  const ageText =
    ageMin != null && ageMax != null
      ? t('public.ageValueBoth', { from: ageMin, to: ageMax })
      : ageMin != null
        ? t('public.ageValueMin', { from: ageMin })
        : ageMax != null
          ? t('public.ageValueMax', { to: ageMax })
          : null

  // Gallery.
  //
  // The menu listing only carries each product's cover, because sending every
  // gallery up front was the bulk of the storefront payload and none of it is
  // seen until a product is opened. So the cover renders immediately and the
  // rest arrives just after — the customer sees an image straight away either
  // way, and a storefront that never gets opened never pays for the galleries.
  const [fetchedImages, setFetchedImages] = useState(null)

  useEffect(() => {
    setFetchedImages(null)
    if (!item?.id || !merchantId) return
    // The storefront listing already carries every gallery URL — they are
    // strings, not image data, so sending them costs nothing and the browser
    // fetches only the ones it paints. A request is only needed for a caller
    // that passed an item without them.
    if (Array.isArray(item.images) && item.images.length) return
    let active = true
    publicService
      .getProductImages(merchantId, item.id)
      .then((res) => active && setFetchedImages(res?.images ?? null))
      .catch(() => {
        // A failed gallery fetch is not worth an error banner — the cover is
        // already on screen and the product is still orderable.
      })
    return () => {
      active = false
    }
  }, [item?.id, item?.images, merchantId])

  const gallery =
    (Array.isArray(fetchedImages) && fetchedImages.length && fetchedImages) ||
    (Array.isArray(item?.images) && item.images.length && item.images) ||
    (item?.image ? [item.image] : [])

  // Stock is tracked only when not null; 0 means out of stock.
  const tracked = item?.stock != null
  const unavailable = item?.availability === 'unavailable'
  const soldOut = item?.availability === 'out_of_stock' || (tracked && Number(item.stock) <= 0)
  const blocked = unavailable || soldOut
  const blockedLabel = unavailable ? t('public.unavailable') : t('public.outOfStock')
  const canAdd = available && !blocked

  // Each time a product is opened, begin with one item. The selector remains
  // local until the customer confirms with the primary button.
  useEffect(() => {
    if (item) {
      setSelectedQuantity(1)
      setSelectedVariantIndex(0)
      setActiveImage(0)
      // A freshly opened product is never in its closing state.
      setClosing(false)
      closingRef.current = false
      // Default each extra option group to its first value.
      setSelectedAttrs(
        Object.fromEntries(
          (Array.isArray(item.attributes) ? item.attributes : []).map((g) => [g.name, g.values[0]]),
        ),
      )
      // Show the first image when a new product opens — the swipe carousel keeps
      // its scroll position across items otherwise. scrollLeft 0 is the start in
      // both LTR and RTL in modern browsers.
      if (galleryRef.current) galleryRef.current.scrollLeft = 0
    }
  }, [item])

  useEffect(() => {
    if (!item) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && requestClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [item, requestClose])
  if (!item) return null

  const addSelectedQuantity = () => {
    if (!canAdd) return
    onAdd(item, selectedQuantity, selectedVariant, selectedAttrs)
    requestClose()
  }

  // Track which image is centred so the dots reflect the swipe position. Uses
  // viewport-relative centres, so it stays correct in both LTR and RTL.
  const onGalleryScroll = () => {
    const el = galleryRef.current
    if (!el) return
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2
    let closest = 0
    let min = Infinity
    Array.from(el.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect()
      const dist = Math.abs(rect.left + rect.width / 2 - mid)
      if (dist < min) {
        min = dist
        closest = index
      }
    })
    setActiveImage(closest)
  }

  const scrollToImage = (index) => {
    galleryRef.current?.children[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  // Portalled to <body>, same reasoning as ui/Modal.jsx: rendered in place, this
  // sheet is a direct child of `.public-storefront`, whose stacking-context CSS
  // forces `position: relative` on its children — that would silently override
  // this `fixed inset-0` and lay the sheet out inline in the page instead of as
  // a viewport overlay.
  //
  // notranslate / translate="no" repeat <html>'s own opt-out on this portal
  // root, so browser translation stays off even if something strips it there.
  return createPortal(
    <div translate="no" className={`notranslate fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`} role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={requestClose} />
      {/* Background follows the merchant's own storefront theme (the same
          --storefront-background/-shadow vars .public-storefront paints with)
          instead of a plain white/slate panel — mixed toward white so an
          arbitrary merchant colour stays a light pastel wash, keeping the
          fixed dark-slate text readable. Dark mode needs no mixing:
          --storefront-background is already the flat near-black default
          there (merchant customization is light-mode only), so it's used
          as-is. Top-to-bottom (not diagonal) so the flat top stop lines up
          with the gallery/fade below, which only ever touch the top edge. */}
      {/* No bottom padding on the scroll area: the sticky action bar below
          sticks to the content edge, so a pb-5 here left a 20px strip beneath
          the bar where scrolled content (size chips, option labels) showed
          through. The bar carries that spacing itself instead. */}
      <section className={`product-sheet relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-gradient-to-b from-[color-mix(in_srgb,var(--storefront-background)_16%,white)] to-[color-mix(in_srgb,var(--storefront-background-shadow)_22%,white)] px-5 pb-0 pt-0 text-slate-900 shadow-2xl dark:from-[var(--storefront-background)] dark:to-[var(--storefront-background-shadow)] dark:text-white sm:mx-auto sm:mb-6 sm:max-w-xl sm:rounded-3xl ${closing ? 'animate-[sheet-down_280ms_cubic-bezier(0.4,0,1,1)_forwards]' : 'animate-[sheet-up_280ms_cubic-bezier(0.22,1,0.36,1)]'}`}>
        {/* Grab handle — floats over the hero image (app-quality detail). */}
        <div className="absolute inset-x-0 top-2.5 z-10 mx-auto h-1.5 w-11 rounded-full bg-white/70 backdrop-blur sm:hidden" />
        <button type="button" onClick={requestClose} className="absolute end-3.5 top-4 z-10 rounded-full bg-white/70 p-2 text-slate-700 shadow-sm ring-1 ring-slate-900/5 backdrop-blur transition hover:bg-white dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10"><Icon name="close" className="h-4 w-4" /></button>
        {gallery.length > 0 ? (
          // Full-bleed hero carousel: the image runs edge-to-edge to the sheet's
          // top and sides, rounding with the sheet's own top corners.
          <div
            ref={galleryRef}
            onScroll={onGalleryScroll}
            className="relative -mx-5 flex snap-x snap-mandatory items-start overflow-x-auto rounded-t-3xl bg-[color-mix(in_srgb,var(--storefront-background)_16%,white)] [scrollbar-width:none] dark:bg-[var(--storefront-background)] sm:rounded-t-3xl [&::-webkit-scrollbar]:hidden"
          >
            {gallery.map((src, index) => (
              <img loading="lazy" decoding="async"
                key={index}
                src={src}
                alt=""
                draggable="false"
                // Whole photo shown (object-contain, no crop), capped in height.
                className="mx-auto max-h-[54vh] w-full shrink-0 snap-center object-contain"
              />
            ))}
            {/* Soft fade so the image melts into the sheet's content below. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--storefront-background)_16%,white)] to-transparent dark:from-[var(--storefront-background)]" />
          </div>
        ) : (
          <div className="-mx-5 flex aspect-[4/3] items-center justify-center rounded-t-3xl bg-slate-100 dark:bg-slate-800">
            <Icon name="image" className="h-12 w-12 text-slate-500" />
          </div>
        )}
        {gallery.length > 1 && (
          // Position dots — the active one takes the storefront accent colour and
          // widens; tapping a dot scrolls the carousel to that image.
          <div className="mt-3 flex justify-center gap-1.5">
            {gallery.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToImage(index)}
                aria-label={`${item.name} ${index + 1}`}
                className={`h-2 rounded-full transition-all ${index === activeImage ? 'accent-surface w-5' : 'w-2 bg-slate-300 dark:bg-slate-600'}`}
              />
            ))}
          </div>
        )}
        {/* Header — name + price on one baseline (left-aligned), then the
            availability chips and the description. Price sits with the title for
            single-priced items; sized items price per variant below instead. */}
        <div className="pt-5 text-start">
          {item.brand && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.brand}</p>}
          <div className="mt-1.5 flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold leading-tight tracking-tight">{item.name}</h2>
            {variants.length === 0 && (
              <div className="shrink-0 text-end leading-tight">
                {hasDiscount && (
                  <div className="mb-0.5 flex items-center justify-end gap-1.5">
                    <Price value={originalPrice} className="text-xs font-medium text-slate-400 line-through" />
                    <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-300">-{discountPct}%</span>
                  </div>
                )}
                <Price value={displayedPrice} className="price-text whitespace-nowrap text-2xl font-extrabold tracking-tight" />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {blocked ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">{blockedLabel}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {tracked ? t('public.inStock', { n: Number(item.stock) }) : t('public.available')}
              </span>
            )}
            {ageText && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-900/5 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-400 dark:text-slate-500">{t('public.ageSuitable')}:</span>
                {ageText}
              </span>
            )}
          </div>
          {item.description && <p className="mt-3.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>}
        </div>

        {/* Priced options (restaurants: sizes with prices): selectable rows.
            Selected state used accent-border + accent-tint (a pale outline
            plus a pale wash) with accent-text for the price — three faint
            layers of the same hue that read as washed-out rather than
            "chosen". The selected card is now a solid accent-surface fill
            (the same proven gradient used everywhere else a choice needs to
            read clearly — Add to cart, the quantity badges), so it's
            unmistakably the picked option regardless of the merchant's
            colour. */}
        {variants.length > 0 && (
          <fieldset className="mt-5 border-t border-slate-100 pt-5 dark:border-white/10">
            <legend className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span aria-hidden="true" className="accent-surface h-3.5 w-1 shrink-0 rounded-full" />
              {item.optionName || t('public.size')}
              {selectedVariant && <span className="ms-1 text-sm font-bold normal-case tracking-normal text-slate-900 dark:text-white">{selectedVariant.value}</span>}
            </legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {variants.map((variant, index) => {
                const selected = index === selectedVariantIndex
                return (
                  <button
                    type="button"
                    key={`${variant.value}-${index}`}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2.5 transition-all ${
                      selected
                        ? 'accent-surface btn-glow btn-glow-custom border-transparent shadow-md'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--merchant-primary)_45%,transparent)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-slate-500'
                    }`}
                  >
                    <span className={`font-bold ${selected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{variant.value}</span>
                    <Price value={variant.price} className={`text-xs font-semibold ${selected ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`} />
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* Option groups: colour swatches for a colour group, a full-width
            grid of pills otherwise (e.g. sizes) — organized, not clustered. */}
        {attributes.map((group) => {
          const asColors = isColorGroup(group)
          const chosen = selectedAttrs[group.name]
          // Short values (S, M, XL, 64GB) keep the compact four-across grid.
          // Longer ones ("جبن إضافي") broke onto two lines in a quarter of a
          // phone's width, so they get cells at least 6.5rem wide instead.
          const shortValues = group.values.every((value) => value.length <= 4)
          return (
            <div key={group.name} className="mt-5 border-t border-slate-100 pt-5 dark:border-white/10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.name}
                {chosen && <span className="ms-2 text-sm font-bold normal-case tracking-normal text-slate-900 dark:text-white">{chosen}</span>}
              </p>
              {asColors ? (
                <div className="flex flex-wrap gap-3">
                  {group.values.map((value) => {
                    const selected = chosen === value
                    const hex = group.colors?.[value] ?? colorHex(value) ?? '#e5e7eb'
                    const choose = () => setSelectedAttrs((prev) => ({ ...prev, [group.name]: value }))
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={choose}
                        title={value}
                        aria-label={value}
                        aria-pressed={selected}
                        className={`flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 transition dark:ring-offset-slate-950 ${selected ? 'ring-2 ring-[var(--merchant-primary)]' : 'ring-1 ring-slate-200 dark:ring-white/15'}`}
                        style={{ backgroundColor: hex }}
                      >
                        {selected && <Icon name="check" className={`h-5 w-5 ${isLightHex(hex) ? 'text-slate-900' : 'text-white'}`} />}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className={shortValues ? 'grid grid-cols-4 gap-2.5' : 'grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2.5'}>
                  {group.values.map((value) => {
                    const selected = chosen === value
                    const choose = () => setSelectedAttrs((prev) => ({ ...prev, [group.name]: value }))
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={choose}
                        aria-pressed={selected}
                        className={`flex min-h-12 items-center justify-center rounded-xl px-2 py-1.5 text-center text-sm font-bold leading-tight transition ${
                          selected
                            ? 'accent-surface text-white shadow-sm'
                            : 'border border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Sticky action bar: quantity + add-to-cart on one row, always reachable.
            The bar's own background is a pastel wash of the merchant's theme
            (so it matches the sheet, not a mismatched plain white/slate strip)
            — the quantity stepper used to share that same pale palette (a
            faint border on a similarly pale background), so it nearly
            disappeared in light mode. It's now a genuinely opaque white/dark
            card with a firmer border and its own shadow, so it reads as a
            control regardless of the bar behind it. Close is now a proper
            bordered button too, not a bare text link. */}
        <div className="sticky bottom-0 -mx-5 mt-6 border-t border-slate-100 bg-[color-mix(in_srgb,var(--storefront-background-shadow)_22%,white)] px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-14px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-[var(--storefront-background-shadow)]">
          {/* A fixed-width stepper and a button that takes the rest. Splitting
              the row evenly (flex-1 each) left the button ~150px on a 360px
              phone, so "إضافة إلى السلة" broke onto three lines and the price
              split in two. The stepper doesn't need more than its two 40px
              targets and the count. */}
          <div className="flex items-stretch gap-2.5">
            {/* No circle badge — just the glyph, directly accent-coloured.
                One layer (icon colour vs. the card's own white/dark
                background) instead of the earlier badge-behind-icon stack,
                so contrast is never in question regardless of the merchant's
                exact hue. */}
            <div className="accent-border flex h-14 w-[7.5rem] shrink-0 items-center gap-0.5 rounded-2xl border-2 bg-white px-1 shadow-sm dark:bg-slate-950/70 sm:w-40">
              <button type="button" disabled={!canAdd || selectedQuantity <= 1} onClick={() => setSelectedQuantity((c) => Math.max(1, c - 1))} className="accent-text flex h-full flex-1 items-center justify-center rounded-xl transition hover:bg-[color-mix(in_srgb,var(--merchant-primary)_14%,transparent)] active:scale-90 disabled:opacity-40" aria-label="-">
                <Icon name="minus" className="h-5 w-5" strokeWidth={2.75} />
              </button>
              <span className="w-7 shrink-0 text-center text-base font-bold tabular-nums text-slate-900 dark:text-white">{selectedQuantity}</span>
              <button type="button" disabled={!canAdd} onClick={() => setSelectedQuantity((c) => c + 1)} className="accent-text flex h-full flex-1 items-center justify-center rounded-xl transition hover:bg-[color-mix(in_srgb,var(--merchant-primary)_14%,transparent)] active:scale-90 disabled:opacity-40" aria-label="+">
                <Icon name="plus" className="h-5 w-5" strokeWidth={2.75} />
              </button>
            </div>
            {/* On phones the label and the total stack as two tidy lines —
                even one line of both needs ~215px, more than a 360px screen
                leaves, and a big total would never fit. From sm: up there is
                room, so they sit on one line with a separator. Every piece is
                nowrap, so neither can break mid-phrase. */}
            <button type="button" disabled={!canAdd} onClick={addSelectedQuantity} className="btn-glow btn-glow-custom accent-surface flex h-14 min-w-0 flex-1 items-center justify-center rounded-2xl px-3 font-bold disabled:opacity-40">
              {blocked ? (
                <span className="truncate whitespace-nowrap text-sm sm:text-base">{blockedLabel}</span>
              ) : (
                <span className="flex min-w-0 flex-col items-center leading-tight sm:flex-row sm:gap-2">
                  <span className="whitespace-nowrap text-sm sm:text-base">{t('public.addToCart')}</span>
                  <span aria-hidden="true" className="hidden opacity-60 sm:inline">·</span>
                  <Price
                    value={Number(displayedPrice) * selectedQuantity}
                    className="whitespace-nowrap text-xs font-semibold tabular-nums opacity-90 sm:text-base sm:font-bold sm:opacity-100"
                  />
                </span>
              )}
            </button>
          </div>
          {/* A small X mark alongside the label, a touch more lift on hover,
              and a soft red-tinted shadow instead of a flat shadow-sm — the
              same "considered, not just functional" polish as the rest of
              this sheet, while staying the plain red it was asked to be. */}
          <button
            type="button"
            onClick={requestClose}
            className="mt-2.5 flex h-14 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-red-200 bg-red-50 text-sm font-bold tracking-tight text-red-600 shadow-[0_6px_16px_-6px_rgba(220,38,38,0.25)] transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:shadow-[0_10px_22px_-8px_rgba(220,38,38,0.35)] active:translate-y-0 active:scale-[0.99] active:bg-red-200 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:active:bg-red-500/25"
          >
            <Icon name="close" className="h-4 w-4 shrink-0" />
            <span>{t('public.close')}</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
