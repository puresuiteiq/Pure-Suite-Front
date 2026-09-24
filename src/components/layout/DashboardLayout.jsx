import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Topbar from './Topbar'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useSignOutConfirm } from '../../hooks/useSignOutConfirm'
import { adminAppearanceService } from '../../services/adminAppearanceService'
import { applyAccentVars, clearAccentVars } from '../../utils/accent'

/**
 * App shell for the Super Admin: a sticky topbar over the routed page content.
 * Navigation is hub-and-spoke — System Overview is home, its KPI cards drill
 * into each section, and the topbar's back arrow returns here — so there's no
 * sidebar. Sign-out lives in the topbar user menu, but is confirmed from here:
 * the topbar's backdrop-blur would otherwise trap the fixed dialog inside it.
 *
 * Back to plain window scrolling (a container-ref-based version was tried and
 * reverted — see SystemOverview.jsx for the current, simpler scroll-memory
 * approach, which needs the window to be the thing that actually scrolls).
 */
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { logout } = useAdminAuth()
  const signOut = useSignOutConfirm(logout)

  // Paint the admin panel in the Super Admin's own chosen colours (from the DB).
  // Applied to <html> so gradient buttons and brand-600 utilities both follow;
  // cleared on leaving the admin area so merchant/storefront pages keep theirs.
  useEffect(() => {
    let cancelled = false
    adminAppearanceService
      .get()
      .then((a) => {
        if (!cancelled) applyAccentVars(a.accentColor, a.accentShadow)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      clearAccentVars()
    }
  }, [])

  return (
    <div className="app-shell flex min-h-full flex-col bg-slate-50 text-slate-900">
      <Topbar onSignOut={signOut.request} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <ConfirmDialog
        open={signOut.open}
        title={t('common.signOut')}
        message={t('common.signOutConfirm')}
        confirmLabel={t('common.signOut')}
        destructive
        icon="logout"
        loading={signOut.signingOut}
        onConfirm={signOut.confirm}
        onCancel={signOut.cancel}
      />
    </div>
  )
}
