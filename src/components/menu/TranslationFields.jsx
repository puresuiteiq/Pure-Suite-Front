import { useTranslation } from 'react-i18next'
import { LANGUAGES, directionFor } from '../../i18n/languages'

/**
 * Optional per-language values for one menu field.
 *
 * The storefront can render a menu in English, Arabic or Kurdish Badini, but a
 * merchant types their menu once — so "shawarma" stayed "shawarma" on every
 * storefront regardless of the language the customer picked. Interface
 * translation cannot help: a product name is data, and nobody had translated
 * it. The columns and the read path for this already existed; there was simply
 * no way to enter anything.
 *
 * Collapsed by default, because it is genuinely optional: the field the
 * merchant already filled in stays the fallback, so leaving every language
 * blank keeps the menu working exactly as it does now.
 *
 * `value` is a `{ en, ar, 'ku-badini' }` map; `onChange(lang, text)` reports a
 * single language at a time.
 */
export default function TranslationFields({
  value,
  onChange,
  label,
  fallback = '',
  multiline = false,
  inputClassName = 'form-input',
}) {
  const { t } = useTranslation()
  const filled = LANGUAGES.filter((lang) => (value?.[lang.code] ?? '').trim()).length

  return (
    <details className="group mt-2 rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {label ?? t('menu.translations')}
        </span>
        <span className="text-xs font-normal text-slate-400">
          {filled > 0 ? t('menu.translationsCount', { count: filled }) : t('menu.optional')}
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-white/10">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t('menu.translationsHint')}
        </p>
        {LANGUAGES.map((lang) => (
          <label key={lang.code} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {lang.label}
            </span>
            {multiline ? (
              <textarea
                rows={2}
                dir={directionFor(lang.code)}
                value={value?.[lang.code] ?? ''}
                onChange={(event) => onChange(lang.code, event.target.value)}
                placeholder={fallback}
                className={inputClassName}
              />
            ) : (
              <input
                type="text"
                dir={directionFor(lang.code)}
                value={value?.[lang.code] ?? ''}
                onChange={(event) => onChange(lang.code, event.target.value)}
                placeholder={fallback}
                className={inputClassName}
              />
            )}
          </label>
        ))}
      </div>
    </details>
  )
}
