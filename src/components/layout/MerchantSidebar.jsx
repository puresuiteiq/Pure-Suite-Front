import { useVerticalT } from '../../hooks/useVerticalT'
import { merchantNavigation } from '../../config/merchantNavigation'
import Icon from '../ui/Icon'
import SidebarNavLink from './SidebarNavLink'

/**
 * Merchant-side navigation rail. Mirrors the Super Admin Sidebar's behaviour
 * (fixed on lg+, off-canvas drawer on mobile) but is branded with the
 * merchant's own business name/logo and signs the user out via auth.
 */
export default function MerchantSidebar({
  open,
  onClose,
  businessName,
  logo,
  onLogout,
}) {
  const initial = businessName?.trim()?.charAt(0)?.toUpperCase() || 'M'
  const { t } = useVerticalT()

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 start-0 z-40 flex w-72 flex-col border-e border-slate-200 bg-white transition-transform duration-300 ease-in-out ${
          open ? '' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'
        }`}
      >
        {/* Business branding */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold on-brand">
              {initial}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-900">
              {businessName || 'My Restaurant'}
            </p>
            <p className="text-xs text-slate-500">{t('topbar.merchantPortal')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-auto flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('nav.manage')}
          </p>
          {merchantNavigation.map((item) => (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              end={item.to === '/merchant'}
              icon={item.icon}
              label={t(item.labelKey)}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_8px_20px_rgba(239,68,68,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <Icon name="logout" className="h-5 w-5" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
    </>
  )
}
