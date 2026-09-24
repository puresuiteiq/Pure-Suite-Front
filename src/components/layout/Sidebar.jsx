import { useTranslation } from 'react-i18next'
import { navigation } from '../../config/navigation'
import Icon from '../ui/Icon'
import SidebarNavLink from './SidebarNavLink'
import { useAdminAuth } from '../../hooks/useAdminAuth'

/**
 * Persistent navigation rail.
 * - Fixed & always visible on lg+ screens.
 * - Slides in as an off-canvas drawer on small screens (controlled by `open`).
 */
export default function Sidebar({ open, onClose }) {
  const { logout } = useAdminAuth()
  const { t } = useTranslation()

  return (
    <>
      {/* Mobile backdrop */}
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
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            R
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">RestoSaaS</p>
            <p className="text-xs text-slate-500">Super Admin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('nav.management')}
          </p>
          {navigation.map((item) => (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              icon={item.icon}
              label={t(item.labelKey)}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Footer / account */}
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="logout" className="h-5 w-5 text-slate-400" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>
    </>
  )
}
