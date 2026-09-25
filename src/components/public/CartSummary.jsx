import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import Price from './Price'

/**
 * The cart's total and the action that sends it.
 *
 * Deliberately rendered into the modal's footer rather than the scrolling
 * body: the price and the checkout button are what the customer came for, and
 * below the item list plus the recommendations carousel they sat off-screen.
 * Pinned here, they're always in view.
 *
 * `unavailableMessage` replaces the WhatsApp hint rather than stacking under
 * it — when the order can't be sent, why not is the only thing worth saying.
 */
export default function CartSummary({
  subtotal,
  currency = 'IQD',
  itemCount = 0,
  onSend,
  canSend,
  unavailableMessage,
}) {
  const { t } = useTranslation()

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t('public.cart.total')}
          {itemCount > 0 && (
            <span className="ms-1.5 text-xs">
              ({t('public.cart.items', { count: itemCount })})
            </span>
          )}
        </span>
        <Price value={subtotal} currency={currency} className="price-text text-xl font-bold tabular-nums" />
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className="btn-glow btn-glow-custom accent-surface mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="send" className="h-4 w-4" />
        {t('public.cart.checkout')}
      </button>

      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        {unavailableMessage || t('public.cart.opensWhatsApp')}
      </p>
    </div>
  )
}
