import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MerchantSidebar from './MerchantSidebar'
import MerchantTopbar from './MerchantTopbar'
import ConfirmDialog from '../ui/ConfirmDialog'
import Icon from '../ui/Icon'
import { VerticalContext } from '../../context/VerticalContext'
import { modeForBusinessType } from '../../config/businessCategories'
import { useAuth } from '../../hooks/useAuth'
import { useSignOutConfirm } from '../../hooks/useSignOutConfirm'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { adminAppearanceService } from '../../services/adminAppearanceService'
import { DEFAULT_ADMIN_ACCENT, DEFAULT_ADMIN_SHADOW } from '../../utils/accent'

// The panel's default button colours when the merchant hasn't picked their own
// (the app's original amber accent). Separate from the storefront's green.
const DEFAULT_PANEL = '#f59e0b'
const DEFAULT_PANEL_SHADOW = '#ea580c'

/**
 * Merchant app shell. Branding (name/logo) comes from the shared profile
 * context, so profile edits update the sidebar/topbar live. Must be rendered
 * inside <MerchantProfileProvider> (see the route wiring in App.jsx).
 */
export default function MerchantLayout() {
  const { session, logout } = useAuth()
  const { profile } = useMerchantProfile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Paint the whole admin panel in the merchant's chosen panel colours. Set on
  // <html> with `data-merchant-brand` so both the gradient buttons
  // (--merchant-primary/-shadow) and any brand-600 utilities pick them up.
  // Scoped to the merchant shell: cleared on unmount so the storefront and the
  // Super Admin area (which don't mount this layout) keep their own colours.
  useEffect(() => {
    const root = document.documentElement
    const primary = profile?.panelColor || DEFAULT_PANEL
    const shadow = profile?.panelShadow || profile?.panelColor || DEFAULT_PANEL_SHADOW
    root.style.setProperty('--merchant-primary', primary)
    root.style.setProperty('--merchant-shadow', shadow)
    root.style.setProperty('--primary-color', primary)
    root.setAttribute('data-merchant-brand', '')
    return () => {
      root.style.removeProperty('--merchant-primary')
      root.style.removeProperty('--merchant-shadow')
      root.style.removeProperty('--primary-color')
      root.removeAttribute('data-merchant-brand')
    }
  }, [profile?.panelColor, profile?.panelShadow])
  const { t } = useTranslation()
  const navigate = useNavigate()
  // One confirmation for both sign-out buttons this shell renders (the rail
  // and the topbar).
  const signOut = useSignOutConfirm(logout)

  const businessName = profile?.businessName
  const logo = profile?.logo
  const vertical = modeForBusinessType(profile?.businessType)
  const { pathname } = useLocation()

  // Admin is impersonating this merchant. Leave the merchant area FIRST (to the
  // merchant's admin detail page), then clear the merchant session — navigating
  // before the clear avoids a flash of the login redirect. The admin session
  // and cookie are untouched, so we land back in the admin area.
  const impersonating = Boolean(session?.impersonated)

  // The banner's own colour: the Super Admin's own accent (not the merchant's
  // --merchant-primary above, which this layout has just repainted to the
  // merchant's panel colour) — it's the one visual cue that this strip is
  // "admin", sitting on top of a panel styled as someone else's. Fetched
  // separately since DashboardLayout, the only other place that reads this,
  // has already unmounted (and cleared its own CSS vars) by the time this
  // layout is on screen. The admin's own auth cookie is untouched during
  // impersonation, so the request still succeeds.
  const [adminAccent, setAdminAccent] = useState(null)
  useEffect(() => {
    if (!impersonating) return undefined
    let cancelled = false
    adminAppearanceService
      .get()
      .then((a) => {
        if (!cancelled) setAdminAccent({ primary: a.accentColor, shadow: a.accentShadow })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [impersonating])

  const exitImpersonation = () => {
    const id = session?.merchantId
    navigate(id ? `/merchants/${id}` : '/merchants')
    logout()
  }

  return (
    <VerticalContext.Provider value={vertical}>
    <div className="app-shell min-h-full bg-slate-50 text-slate-900">
      <MerchantSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        businessName={businessName}
        logo={logo}
        onLogout={signOut.request}
      />

      <div className="flex min-h-full flex-col lg:ps-72">
        {impersonating && (
          /* flex-nowrap (was flex-wrap): Arabic's translation is short
             enough to fit the icon+text+button on one line, but the
             English/Kurdish strings are longer and wrapped, which flex-wrap
             "resolved" by dropping the button to its own line — instead of
             (the actual goal) shrinking the text and truncating it, which is
             what min-w-0 + truncate below are for. Only takes effect once
             wrapping isn't an option. */
          <div
            className="flex flex-nowrap items-center justify-between gap-x-4 px-4 py-2.5 text-sm text-white shadow-[0_2px_10px_-2px_rgb(0_0_0_/_0.25)] sm:px-6"
            style={{
              backgroundImage: `linear-gradient(135deg, ${adminAccent?.primary || DEFAULT_ADMIN_ACCENT}, ${adminAccent?.shadow || adminAccent?.primary || DEFAULT_ADMIN_SHADOW})`,
            }}
          >
            <span className="inline-flex min-w-0 flex-1 items-center gap-2.5 font-semibold">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Icon name="user" className="h-4 w-4" />
              </span>
              <span className="truncate">
                {t('impersonation.banner', { name: businessName || session?.email || '' })}
              </span>
            </span>
            <button
              type="button"
              onClick={exitImpersonation}
              className="shrink-0 rounded-full bg-white/20 px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-white/30"
            >
              {t('impersonation.exit')}
            </button>
          </div>
        )}
        <MerchantTopbar
          onMenuClick={() => setSidebarOpen(true)}
          businessName={businessName}
          email={session?.email}
          onLogout={signOut.request}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

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
    </VerticalContext.Provider>
  )
}
