import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'

/**
 * Floating bottom navigation for the storefront — two pill buttons the customer
 * always has in reach: "Menu" (jumps back to the top of the menu) and "Cart"
 * (opens the cart drawer, with a live item count).
 *
 * "Menu" is the filled/active pill in the merchant's storefront colour
 * (accent-surface); "Cart" is the light one. Centred with `inset-x-0` +
 * `justify-center` so it stays put in both LTR and RTL. Sits at z-40 — below the
 * z-50 modals/sheets, so opening the cart or a product hides it behind the
 * backdrop rather than floating on top.
 *
 * The *bar itself* stays a plain, understated capsule (modest border/shadow,
 * no blur, no dramatic hover lift) — the polish belongs to the Menu button
 * inside it, not the container carrying it.
 */
export default function StorefrontNav({ itemCount = 0, onMenuClick, onCartClick }) {
  const { t } = useTranslation()

  return (
    <div className="storefront-nav pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <nav className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white p-1.5 shadow-md dark:border-white/10 dark:bg-slate-900">
        {/* Menu / home — the one deliberately polished element here: the
            merchant's own accent-surface gradient plus the same glow used on
            Add to cart, instead of that flair sitting on the bar itself. */}
        <button
          type="button"
          onClick={onMenuClick}
          className="btn-glow btn-glow-custom accent-surface flex min-w-[104px] flex-col items-center gap-1 rounded-full px-6 py-2 text-white transition-transform active:scale-95"
        >
          <Icon name="home" className="h-5 w-5" />
          <span className="text-xs font-semibold">{t('public.nav.menu')}</span>
        </button>

        {/* Cart — light pill with a live count badge. */}
        <button
          type="button"
          onClick={onCartClick}
          className="flex min-w-[104px] flex-col items-center gap-1 rounded-full px-6 py-2 text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 dark:text-slate-100 dark:hover:bg-white/10"
        >
          <span className="relative">
            <Icon name="cart" className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="accent-surface absolute -end-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white">
                {itemCount}
              </span>
            )}
          </span>
          <span className="text-xs font-semibold">{t('public.nav.cart')}</span>
        </button>
      </nav>
    </div>
  )
}
