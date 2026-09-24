import Icon from '../ui/Icon'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import ThemeToggle from '../ui/ThemeToggle'
import NotificationsMenu from './NotificationsMenu'
import { merchantNotificationsService } from '../../services/merchantNotificationsService'

/**
 * Merchant-side sticky header: mobile nav toggle and the business name.
 * Sign-out lives in the sidebar.
 */
export default function MerchantTopbar({
  onMenuClick,
  businessName,
  email,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-600 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
        aria-label="Open navigation"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {businessName || 'My Restaurant'}
        </p>
        {email && <p className="truncate text-xs text-slate-500">{email}</p>}
      </div>

      <div className="ms-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        <LanguageSwitcher />

        <NotificationsMenu service={merchantNotificationsService} />
      </div>
    </header>
  )
}
