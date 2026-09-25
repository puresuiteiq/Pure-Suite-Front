import Icon from '../../ui/Icon'
import LanguageSwitcher from '../../ui/LanguageSwitcher'
import ThemeToggle from '../../ui/ThemeToggle'
import { useVerticalT } from '../../../hooks/useVerticalT'

/**
 * Pieces every storefront theme's header shares. The themes differ in how
 * they look, not in what a customer can do: the same search, light/dark and
 * language controls, the same open/closed status.
 */

/** Search, light/dark and language — the header's utility buttons. */
export function StorefrontTools({ searchOpen, onToggleSearch, className = '' }) {
  const { t } = useVerticalT()
  return (
    <div className={`sf-tools flex shrink-0 items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onToggleSearch}
        aria-label={t('public.search')}
        aria-expanded={searchOpen}
        className={`sf-tool inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 ${searchOpen ? 'is-active' : ''}`}
      >
        <Icon name="search" className="h-5 w-5" />
      </button>
      <ThemeToggle tone="bare" />
      <LanguageSwitcher tone="bare" />
    </div>
  )
}

/** "Open now" / "Closed", with a status dot. */
export function OpenStatus({ isOpen, className = '' }) {
  const { t } = useVerticalT()
  return (
    <span className={`sf-open-status inline-flex items-center gap-1.5 ${isOpen ? 'is-open' : 'is-closed'} ${className}`}>
      <span aria-hidden="true" className="sf-open-dot h-2 w-2 rounded-full" />
      {isOpen ? t('public.openNow') : t('public.closed')}
    </span>
  )
}
