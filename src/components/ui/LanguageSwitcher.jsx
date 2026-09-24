import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import { LANGUAGES } from '../../i18n/languages'
import { useClickOutside } from '../../hooks/useClickOutside'

/**
 * Header language toggle (English / Arabic / Kurdish Badini). Changing the
 * language persists it (LanguageDetector → localStorage) and flips document
 * direction via the effect in App. `tone="dark"` styles the trigger for dark
 * surfaces (e.g. the admin login). `tone="bare"` drops the border/background/
 * shadow chip entirely — just the icon, for the public storefront header.
 */
export default function LanguageSwitcher({ tone = 'light' }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false), open)

  const current =
    LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  const select = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  const triggerClass =
    tone === 'bare'
      ? 'p-1.5 text-slate-500 transition-all hover:scale-110 hover:text-slate-900 active:scale-95 dark:text-slate-300 dark:hover:text-white'
      : `rounded-xl border px-2.5 py-2 text-sm shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md ${
          tone === 'dark'
            ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            : 'border-slate-200/70 bg-white/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
        }`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 ${triggerClass}`}
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="globe" className="h-5 w-5" />
        <span className="hidden sm:inline">{current.short}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-30 mt-2 w-48 origin-top-end rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl motion-safe:animate-[menu-pop_160ms_cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-slate-900/95"
        >
          {LANGUAGES.map((lang) => {
            const active = lang.code === current.code
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => select(lang.code)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                  active
                    ? 'bg-amber-400/15 font-semibold text-amber-700 dark:text-amber-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                }`}
              >
                <span>{lang.label}</span>
                {active && <Icon name="check" className="h-4 w-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
