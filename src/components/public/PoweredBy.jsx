import { useTranslation } from 'react-i18next'
import logo from '../../assets/picture/logo1.png'

/**
 * Platform attribution shown on every storefront. Rendered from platform code
 * (PublicMenu), never from merchant-supplied data — restaurants control their
 * profile and menu, not this page's markup, so there is no setting that hides
 * it. That's what makes the branding permanent.
 *
 * The mark is the real platform logo (src/assets/picture/logo1.png). Swap that
 * import and PLATFORM_NAME here to change the branding — this is where it lives.
 */
const PLATFORM_NAME = 'RestoSaaS'

export default function PoweredBy({ branding }) {
  const { t } = useTranslation()
  const poweredBy = branding?.poweredByText || t('public.poweredBy')
  const platformName = branding?.name || PLATFORM_NAME
  const platformLogo = branding?.logo || logo
  // Super Admin-chosen text colours (hex). Unset → the original slate tones,
  // so a platform that hasn't touched these fields looks exactly as before.
  const poweredByColor = branding?.poweredByColor || undefined
  const nameColor = branding?.nameColor || undefined
  return (
    <footer className="mt-12 flex items-center justify-center gap-2 border-t border-slate-200 py-8 text-slate-400 dark:border-white/10">
      <span className="text-xs font-medium" style={{ color: poweredByColor }}>{poweredBy}</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded-xl p-1 transition-[background-color,box-shadow,scale] duration-300 ease-out hover:bg-slate-500/5 hover:shadow-[0_0_18px_2px_rgba(148,163,184,0.28)] motion-safe:hover:scale-[1.04]">
          <img src={platformLogo} alt={platformName} className="h-10 w-auto max-w-[150px] object-contain" />
        </span>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-300" style={{ color: nameColor }}>
          {platformName}
        </span>
      </span>
    </footer>
  )
}
