import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import Icon from '../ui/Icon'
import UserMenu from './UserMenu'
import Modal from '../ui/Modal'
import ChangePasswordForm from '../auth/ChangePasswordForm'
import { adminAuthService } from '../../services/adminAuthService'
import NotificationsMenu from './NotificationsMenu'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import ThemeToggle from '../ui/ThemeToggle'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import logo from '../../assets/picture/logo1.png'

/**
 * Sticky header for the Super Admin area. There's no sidebar — navigation is
 * hub-and-spoke, so the leading slot shows the brand/home link on System
 * Overview and a back-to-overview arrow on every drill-down page.
 *
 * `onSignOut` is raised to <DashboardLayout> rather than handled here: this
 * header sets `backdrop-blur`, which makes it the containing block for
 * position:fixed descendants, so a confirm dialog rendered inside it would be
 * trapped at header height instead of covering the viewport.
 */
export default function Topbar({ onSignOut }) {
  const { session } = useAdminAuth()
  // The modal is mounted here rather than inside UserMenu so UserMenu stays
  // presentational, matching how sign-out is already raised out of it.
  const [passwordOpen, setPasswordOpen] = useState(false)
  const { t } = useTranslation()
  const { pathname, state } = useLocation()
  const showBack = pathname !== '/'
  // A merchant detail page (/merchants/:id) is reached from the merchants list,
  // so its back arrow returns there — every other drill-down goes to Overview.
  const isMerchantDetail = /^\/merchants\/[^/]+$/.test(pathname)
  const backTo = isMerchantDetail ? (state?.backTo || '/merchants') : '/'
  const backLabel = isMerchantDetail
    ? state?.backTo === '/subscriptions'
      ? t('subscriptions.back')
      : t('merchantDetails.back')
    : t('topbar.backToOverview')

  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] items-center gap-2 border-b sm:gap-4 border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      {/* Leading: back arrow on drill-down pages, brand/home on the overview */}
      {showBack ? (
        <Link
          to={backTo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label={backLabel}
        >
          <Icon name="arrowLeft" className="h-5 w-5 rtl:rotate-180" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>
      ) : (
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label={t('auth.superAdmin')}
        >
          {/* The mark sits flat at rest and only lights up under the cursor.
              `.brand-logo-chip` (index.css) carries the theme work: a white
              plate in light mode, and in dark mode no plate at all — the
              artwork itself is recoloured white. The glow and the lift ride on
              the <img> rather than this span, because a filter or a transform
              here would break that dark-mode recolour. */}
          {/* Smaller mark and no wordmark on narrow phones: at 320px the logo,
              "RestoSaaS" and the four action buttons needed ~40px more than
              the header had, and pushed the whole page sideways. */}
          <span className="brand-logo-chip flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1.5 sm:h-14 sm:w-14">
            <img
              src={logo}
              alt="RestoSaaS"
              className="h-full w-full object-contain motion-safe:group-hover:scale-[1.06]"
            />
          </span>
          <span className="hidden leading-tight min-[400px]:block">
            <span className="block text-sm font-semibold text-slate-900 transition-colors duration-300 group-hover:text-brand-600">
              RestoSaaS
            </span>
            <span className="block text-xs text-slate-500">
              {t('auth.superAdmin')}
            </span>
          </span>
        </Link>
      )}

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Icon
          name="search"
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          placeholder={t('topbar.searchPlaceholder')}
          className="w-full rounded-xl border border-slate-200/70 bg-white/60 py-2.5 pe-3 ps-9 text-sm text-slate-700 shadow-sm backdrop-blur transition-all placeholder:text-slate-400 hover:bg-white focus:border-brand-400 focus:bg-white focus:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
        />
      </div>

      <div className="ms-auto flex items-center gap-1.5 sm:gap-3">
        <ThemeToggle />

        <LanguageSwitcher />

        <NotificationsMenu />

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <UserMenu
          name={session?.name || 'Super Admin'}
          email={session?.email}
          onSignOut={onSignOut}
        />
      </div>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title={t('auth.changePassword')}
        subtitle={t('auth.changePasswordSubtitle')}
        icon="lock"
      >
        <ChangePasswordForm onSubmit={adminAuthService.changePassword} autoFocus />
      </Modal>
    </header>
  )
}
