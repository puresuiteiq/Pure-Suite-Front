import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import { useTheme } from '../../hooks/useTheme'

/**
 * Header light/dark toggle. Shows the icon of the theme you'd switch *to*.
 * `tone="dark"` styles the trigger for dark surfaces (the login screens),
 * matching LanguageSwitcher. `tone="bare"` drops the border/background/shadow
 * chip entirely — just the icon, for the public storefront header.
 */
export default function ThemeToggle({ tone = 'light' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  const wrapperClass =
    tone === 'bare'
      ? 'p-1.5 text-slate-500 transition-all hover:scale-110 hover:text-slate-900 active:scale-95 dark:text-slate-300 dark:hover:text-white'
      : `rounded-xl border p-2 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md ${
          tone === 'dark'
            ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
            : 'border-slate-200/70 bg-white/60 text-slate-500 hover:bg-white hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
        }`

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={wrapperClass}
      aria-label={t('theme.toggle')}
      title={isDark ? t('theme.light') : t('theme.dark')}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="h-5 w-5" />
    </button>
  )
}
