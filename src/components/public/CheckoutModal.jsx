import { useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import Modal from '../ui/Modal'
import Icon from '../ui/Icon'
import Select from '../ui/Select'
import { formatCurrency } from '../../utils/format'
import Price from './Price'
import { enabledMethods, methodLabelKey } from '../../config/serviceMethods'
import { useTheme } from '../../hooks/useTheme'
import { themedPanelStyle } from '../../utils/themedPanel'

/** Order number shown as a zero-padded reference, e.g. 19 → "0019". */
const orderRef = (n) => String(n ?? '').padStart(4, '0')

const METHOD_ICON = { delivery: 'send', dinein: 'store', pickup: 'cart' }

/**
 * Two-step checkout in one modal:
 *  1. Form — pick a service method (when the merchant offers them), fill
 *     name/phone (+ address for delivery, +table for dine-in), then
 *     `onSubmit(details)`. The parent saves the order (awaited) to get its number
 *     and the server-computed delivery fee.
 *  2. Confirmation — once the parent passes `placedOrder`, show a receipt and a
 *     "Confirm via WhatsApp" button wired to `onSend`.
 *
 * `serviceMethods` is the merchant's config (null = none → plain checkout).
 * `subtotal` is the cart's item total, so the fee/total preview is live.
 * `placedOrder`: { merchantOrderNo, name, phone, cartItems, subtotal, total,
 *   serviceMethod, deliveryZone, deliveryFee, tableNumber }.
 */
export default function CheckoutModal({
  open,
  onClose,
  onSubmit,
  submitting,
  placedOrder,
  onSend,
  submitError,
  serviceMethods,
  subtotal = 0,
  currency = 'IQD',
}) {
  const { t, vertical } = useVerticalT()
  const { theme } = useTheme()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [method, setMethod] = useState('')
  const [zone, setZone] = useState('')
  const [area, setArea] = useState('')
  const [table, setTable] = useState('')
  const [error, setError] = useState(null)

  // A store never offers dine-in, even if an old config still has it enabled.
  const methods = enabledMethods(serviceMethods).filter(
    (key) => vertical !== 'store' || key !== 'dinein',
  )
  const hasMethods = methods.length > 0
  // Effective selection without needing an effect: fall back to the first method.
  const selectedMethod = hasMethods
    ? methods.includes(method)
      ? method
      : methods[0]
    : null

  const zones = serviceMethods?.delivery?.zones ?? []
  const selectedZone =
    zones.find((z) => z.name === zone)?.name ?? (zones[0]?.name ?? '')
  const selectedZoneConfig = zones.find((z) => z.name === selectedZone) ?? null
  const areas = Array.isArray(selectedZoneConfig?.areas) ? selectedZoneConfig.areas : []
  const selectedArea =
    areas.find((a) => a.name === area)?.name ?? (areas[0]?.name ?? '')
  const selectedAreaConfig = areas.find((a) => a.name === selectedArea) ?? null
  const deliveryZoneValue =
    selectedAreaConfig
      ? `${selectedZoneConfig.name} / ${selectedAreaConfig.name}`
      : selectedZone
  const deliveryFee =
    selectedMethod === 'delivery'
      ? Number(selectedAreaConfig?.fee ?? selectedZoneConfig?.fee ?? 0)
      : 0
  const total = subtotal + deliveryFee

  // Address is only relevant for delivery (and for the legacy no-methods flow).
  const needsAddress = !hasMethods || selectedMethod === 'delivery'

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError(t('public.checkout.required'))
      return
    }
    if (needsAddress && !address.trim()) {
      setError(t('public.checkout.required'))
      return
    }
    if (selectedMethod === 'delivery' && zones.length > 0 && !selectedZone) {
      setError(t('public.checkout.pickZone'))
      return
    }
    setError(null)
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      address: needsAddress ? address.trim() : '',
      notes: notes.trim(),
      serviceMethod: hasMethods ? selectedMethod : null,
      deliveryZone: selectedMethod === 'delivery' ? deliveryZoneValue : null,
      tableNumber: selectedMethod === 'dinein' ? table.trim() : null,
    })
  }

  const confirmed = Boolean(placedOrder)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={confirmed ? t('public.checkout.orderSent') : t('public.checkout.title')}
      panelStyle={themedPanelStyle(theme)}
      panelClassName="storefront-modal notranslate"
      footer={
        confirmed ? (
          <button
            type="button"
            onClick={onSend}
            className="btn-glow btn-glow-custom accent-surface flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3.5 text-sm font-bold text-white sm:text-base"
          >
            <Icon name="message" className="h-5 w-5 shrink-0" />
            {t('public.checkout.sendWhatsapp')}
          </button>
        ) : (
          // Not the shared <Button size="lg">: its fixed px-6 / text-base left
          // "Send order via WhatsApp" wider than a 320–360px phone's modal, so
          // the label wrapped. Same primary look, smaller type below sm.
          <button
            type="submit"
            form="checkout-form"
            disabled={submitting}
            className="btn-glow btn-glow-custom merchant-primary inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:gap-2.5 sm:px-6 sm:text-base"
          >
            <Icon name="message" className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            {submitting ? t('common.working') : t('public.checkout.send')}
          </button>
        )
      }
    >
      {confirmed ? (
        <div className="py-1">
          {/* Success hero — a solid accent-surface fill with a white
              checkmark (plus its own glow), not accent-tint + accent-text: a
              pale wash on a pale wash washed the icon out almost to
              invisibility — the same fix already applied to every other
              icon badge on this storefront (the stepper, the close button,
              the hours/reviews summary badges). */}
          <div className="text-center">
            <span className="accent-surface btn-glow btn-glow-custom mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full text-white">
              <Icon name="check" className="h-9 w-9" />
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('public.checkout.orderSent')}
            </h3>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--merchant-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--merchant-primary)_6%,white)] px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="text-slate-400 dark:text-slate-500">{t('public.checkout.orderNumberLabel')}</span>
              #{orderRef(placedOrder.merchantOrderNo)}
            </div>
            <p className="mx-auto mt-2.5 max-w-xs text-sm text-slate-500">
              {t('public.checkout.orderPlacedHint')}
            </p>
          </div>

          {/* Receipt: a segmented card — header, items, totals, customer.
              Each section previously had its own separate light-tinted
              background wash (header/total/customer) while the card itself
              had none, sitting directly on the modal's own, much more
              saturated purple panel — that read as a patchwork of
              disconnected light boxes rather than one card. One consistent
              background on the card itself, plain neutral dividers between
              sections, fixes it. */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] bg-white text-start shadow-[0_10px_24px_-14px_rgb(15_23_42_/_0.25)] dark:bg-slate-900/85 dark:border-white/10">
            {/* Header: "Order details" + the service method chip. Solid
                accent-surface icon badge, not accent-tint — a pale wash badge
                is illegible against this now much-lighter card. */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="accent-surface flex h-6 w-6 items-center justify-center rounded-lg text-white">
                  <Icon name="cart" className="h-3.5 w-3.5" />
                </span>
                {t('public.checkout.orderDetails')}
              </span>
              {placedOrder.serviceMethod && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Icon name={METHOD_ICON[placedOrder.serviceMethod] ?? 'cart'} className="h-4 w-4 text-slate-400" />
                  {t(methodLabelKey(placedOrder.serviceMethod))}
                  {placedOrder.serviceMethod === 'delivery' && placedOrder.deliveryZone && ` · ${placedOrder.deliveryZone}`}
                  {placedOrder.serviceMethod === 'dinein' && placedOrder.tableNumber &&
                    ` · ${t('public.checkout.tableLabel', { n: placedOrder.tableNumber })}`}
                </span>
              )}
            </div>

            {/* Items */}
            <ul className="divide-y divide-slate-100 px-4 dark:divide-white/5">
              {(placedOrder.cartItems ?? []).map((item) => {
                const opts = [item.variantValue, ...Object.values(item.attributes ?? {})].filter(Boolean)
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                      {opts.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{opts.join(' · ')}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      <Price value={item.price} currency={item.currency} className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100" />
                      <span className="ms-1 text-xs text-slate-400">×{item.quantity}</span>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Totals — plain rows on the card's own background, a single
                divider ahead of the total instead of a separate tinted pill
                (which, like the header/customer strips above, was its own
                disconnected-looking box). */}
            <div className="space-y-3.5 border-t border-slate-100 px-4 pb-3 pt-2 text-sm dark:border-white/10">
              {placedOrder.deliveryFee > 0 && (
                <>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>{t('public.checkout.subtotal')}</span>
                    <Price value={placedOrder.subtotal} currency={placedOrder.currency ?? currency} className="font-semibold tabular-nums text-slate-800 dark:text-slate-100" />
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>{t('public.checkout.deliveryFee')}</span>
                    <Price value={placedOrder.deliveryFee} className="font-semibold tabular-nums text-slate-800 dark:text-slate-100" />
                  </div>
                </>
              )}
              <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-white/10">
                <span className="text-base font-bold text-slate-900 dark:text-white">{t('public.cart.total')}</span>
                <Price value={placedOrder.total} currency={placedOrder.currency ?? currency} className="text-xl font-extrabold tabular-nums text-slate-900 dark:text-white" />
              </div>
            </div>

            {/* Customer */}
            {(placedOrder.name || placedOrder.phone) && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                {placedOrder.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
                    {placedOrder.name}
                  </span>
                )}
                {placedOrder.phone && (
                  <span className="inline-flex items-center gap-1.5" dir="ltr">
                    <Icon name="phone" className="h-3.5 w-3.5 text-slate-400" />
                    {placedOrder.phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form id="checkout-form" onSubmit={submit} className="space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('public.checkout.subtitle')}</p>
          {(error || submitError) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || submitError}</span>
            </div>
          )}

          {/* Service method — only shown when the merchant offers methods.
              Plain-text label, same as every other Field in this form (an
              icon here duplicated the method's own icon one line down — e.g.
              "send" appearing on both the label and the Delivery badge reads
              as a copy-paste slip, not a deliberate pairing). Columns match
              the option count (1/2/3) so a merchant offering just one method
              gets one deliberate full-width card instead of a lone button
              stranded in an empty 3-column grid; the active card gets an icon
              badge, a checkmark, and the accent-surface gradient instead of a
              flat fill. */}
          {hasMethods && (
            <Field label={t('public.checkout.method')}>
              {/* Three methods sit in a row only from 420px up. Narrower, a
                  third of the modal is too thin for "Table service" /
                  "خدمة الطاولة", which broke onto two lines — so they stack
                  as full-width rows instead. */}
              <div className={`grid gap-2.5 ${methods.length === 1 ? 'grid-cols-1' : methods.length === 2 ? 'grid-cols-2' : 'grid-cols-1 min-[420px]:grid-cols-3'}`}>
                {methods.map((key) => {
                  const active = key === selectedMethod
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      aria-pressed={active}
                      className={`group relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[3px] hover:scale-[1.012] ${
                        methods.length === 1
                          ? 'flex-row'
                          : methods.length === 2
                            ? 'flex-col text-xs'
                            : 'flex-row min-[420px]:flex-col min-[420px]:text-xs'
                      } ${
                        active
                          ? 'accent-surface border-transparent text-white shadow-[0_10px_26px_-10px_var(--merchant-shadow)] hover:shadow-[0_20px_40px_-12px_var(--merchant-shadow)]'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {active && (
                        <span className="absolute end-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/25">
                          <Icon name="check" className="h-2.5 w-2.5" />
                        </span>
                      )}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          active ? 'bg-white/20' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                        }`}
                      >
                        <Icon name={METHOD_ICON[key]} className="h-[18px] w-[18px]" />
                      </span>
                      {t(methodLabelKey(key))}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* autoComplete lets a returning customer fill fields from the browser. */}
          <Field label={t('public.checkout.name')} icon="user">
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" autoComplete="name" className="checkout-input checkout-input--icon" />
          </Field>
          <Field label={t('public.checkout.phone')} icon="phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" dir="ltr" className="checkout-input checkout-input--icon text-start" />
          </Field>

          {selectedMethod === 'delivery' && zones.length > 0 && (
            <Field label={t('public.checkout.deliveryZone')}>
              {/* Select is shared with the admin dashboard, so it's not safe
                  to restyle .form-input globally — .checkout-zone-select
                  (index.css) scopes the same animated-on-hover luxury
                  treatment as .checkout-input to just this one field, and
                  wins over .form-input by being unlayered and declared after
                  it (no !important needed — see the .checkout-input comment
                  in index.css for why a plain className override wouldn't
                  otherwise beat it). */}
              <Select
                value={selectedZone}
                onChange={(next) => {
                  setZone(next)
                  setArea('')
                }}
                placeholder={t('public.checkout.chooseZone')}
                className="checkout-zone-select"
                options={zones.map((z) => ({
                  value: z.name,
                  label: `${z.name} · ${formatCurrency(z.fee)}`,
                }))}
              />
            </Field>
          )}

          {selectedMethod === 'delivery' && areas.length > 0 && (
            <Field label={t('public.checkout.deliveryArea')}>
              <Select
                value={selectedArea}
                onChange={setArea}
                placeholder={t('public.checkout.chooseArea')}
                className="checkout-zone-select"
                options={areas.map((a) => ({
                  value: a.name,
                  label: `${a.name} · ${formatCurrency(a.fee)}`,
                }))}
              />
            </Field>
          )}

          {needsAddress && (
            <Field label={t('public.checkout.address')} icon="mapPin">
              <input value={address} onChange={(e) => setAddress(e.target.value)} type="text" autoComplete="street-address" className="checkout-input checkout-input--icon" />
            </Field>
          )}

          {selectedMethod === 'dinein' && (
            <Field label={t('public.checkout.tableNumberOptional')}>
              <input value={table} onChange={(e) => setTable(e.target.value)} type="text" inputMode="numeric" className="checkout-input" />
            </Field>
          )}

          <Field label={t('public.checkout.notes')}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="checkout-input resize-none" />
          </Field>

          {/* Live total preview with the delivery fee (only when methods exist).
              Accent-tinted card (not a flat grey box) with the same
              bold-accent-number treatment as the confirmed receipt below, so
              the total reads as the thing to scan, and a header row for
              hierarchy — a quieter echo of the post-submit receipt card. */}
          {hasMethods && (
            <div className="checkout-summary-card overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--merchant-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--merchant-primary)_6%,white)] dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] px-4 py-3 dark:border-white/10">
                <span className="accent-tint accent-text flex h-7 w-7 items-center justify-center rounded-lg">
                  <Icon name="cart" className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('public.checkout.orderDetails')}</span>
              </div>
              <div className="space-y-2.5 px-4 py-3.5 text-sm">
                {deliveryFee > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Icon name="cart" className="h-3.5 w-3.5 opacity-60" />
                        {t('public.checkout.subtotal')}
                      </span>
                      <Price value={subtotal} currency={currency} className="tabular-nums font-semibold text-slate-700 dark:text-slate-200" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Icon name="mapPin" className="h-3.5 w-3.5 opacity-60" />
                        {t('public.checkout.deliveryFee')}
                      </span>
                      <Price value={deliveryFee} className="tabular-nums font-semibold text-slate-700 dark:text-slate-200" />
                    </div>
                  </>
                )}
                {/* The total gets its own tinted "pill" instead of just a
                    divider + bold text — a flat list of three same-weight
                    rows (called out as looking plain/dated) buried the one
                    number that actually matters among the others. */}
                <div className="accent-tint mt-1 flex items-center justify-between rounded-xl px-3 py-2.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{t('public.cart.total')}</span>
                  {/* Plain ink, not the accent: the merchant's colour on its own
                      tint (the pill behind) was 2.6:1 with the default green. */}
                  <Price value={total} currency={currency} className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white" />
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold text-slate-800 dark:text-slate-100">{label}</span>
      {icon ? (
        <div className="checkout-input-wrap relative">
          {/* A solid tinted badge, not a bare pale glyph — matches the icon
              badges on the service-method cards above so the field reads as
              deliberately designed rather than a plain input with a hint.
              checkout-input-wrap/-icon (index.css) sync this badge's pop to
              the input's own hover/focus animation via :has(). */}
          <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center">
            <span className="checkout-input-icon accent-tint accent-text flex h-8 w-8 items-center justify-center rounded-xl">
              <Icon name={icon} className="h-[17px] w-[17px]" />
            </span>
          </span>
          {children}
        </div>
      ) : (
        children
      )}
    </label>
  )
}
