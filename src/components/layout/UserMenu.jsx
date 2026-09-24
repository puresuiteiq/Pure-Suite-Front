import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import { useClickOutside } from '../../hooks/useClickOutside'

/**
 * Avatar button with a dropdown containing account info and a Sign out action.
 * `onSignOut` is wired to the admin logout service by the caller.
 */
/**
 * Up to two initials from a name — "Super Admin" → "SA", "Ahmed" → "A". The
 * monogram was previously the literal string "SA", so it kept claiming those
 * initials for whoever was signed in.
 */
function initialsOf(name) {
  const letters = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return letters.toUpperCase() || 'SA'
}

export default function UserMenu({ name = 'Super Admin', email, onSignOut, onChangePassword }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { t } = useTranslation()
  useClickOutside(ref, () => setOpen(false), open)

  const handleChangePassword = () => {
    setOpen(false)
    onChangePassword?.()
  }

  const handleSignOut = () => {
    setOpen(false)
    onSignOut?.()
  }

  return (
    <div ref={ref} className="relative">
      {/* In dark mode the resting plate read as a pale box floating around the
          monogram, so there it only materialises under the cursor. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 p-1 pe-2 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-transparent dark:bg-transparent dark:shadow-none dark:hover:border-white/10 dark:hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Matches the brand mark in <Topbar> and the merchant rail: same 36px
            box, same corners, same weight. It's the only monogram in the app
            that was a 32px semibold circle, which read as a mistake rather than
            a distinction. Only the type scale differs, because two letters have
            to fit where one did. */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold tracking-tight on-brand">
          {initialsOf(name)}
        </span>
        <span className="hidden text-start leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{name}</span>
          <span className="block text-xs text-slate-500">
            {t('topbar.platformOwner')}
          </span>
        </span>
        <Icon
          name="chevronDown"
          className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-2 w-64 origin-top-end overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl motion-safe:animate-[menu-pop_160ms_cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-slate-900/95"
        >
          {/* Identity header with the same monogram as the trigger. */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-white/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold tracking-tight on-brand">
              {initialsOf(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {name}
              </p>
              {email && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleChangePassword}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-start text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
            >
              <Icon name="lock" className="h-4 w-4" />
              {t('auth.changePassword')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-start text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_8px_20px_rgba(239,68,68,0.18)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Icon name="logout" className="h-4 w-4" />
              {t('common.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
