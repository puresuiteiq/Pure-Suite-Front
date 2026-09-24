import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/format'

/**
 * Brand-colour picker. Most groups are a primary + shadow pair:
 *  - `system`     → the admin panel's own buttons (Save, Add, Download, …)
 *  - `storefront` → the public menu customers see (add-to-cart / "+")
 *  - `storefrontBackground` / `storefrontBackgroundDark` → the storefront's
 *    own canvas colour, per theme
 * `priceColor` is a single flat colour instead — the text colour for every
 * price shown to customers (product cards, cart, checkout), independent of
 * the `storefront` accent above so a merchant can make prices stand out in
 * their own colour rather than inheriting the button colour.
 *
 * Controlled by the merchant profile form: it reports edits via
 * `onChange(group, next)` — `{primary, shadow}` for the paired groups, a bare
 * hex string for `priceColor` — and the colours save with the page's main
 * "Save" button, so saving them can't clobber other unsaved edits. All
 * persist to the DB, so the panel follows the merchant on any device and the
 * storefront shows customers the chosen colours.
 */
export default function ThemeCustomization({ system, storefront, storefrontBackground, storefrontBackgroundDark, priceColor, onChange }) {
  const { t } = useTranslation()

  return (
    <section className="profile-glass luxury-card p-6">
      {/* The section title and the first group's title used to sit as two
          adjacent bare lines, which read as one run-on heading. A subtitle and
          a rule under the section header separate the two levels. */}
      <header className="border-b border-slate-200/70 pb-4 dark:border-white/10">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {t('profile.themeCustomization')}
        </h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t('profile.themeCustomizationHint')}
        </p>
      </header>

      <div className="mt-6 space-y-6">
        <ColorGroup
          title={t('profile.systemColors')}
          hint={t('profile.systemColorsHint')}
          value={system}
          onChange={(next) => onChange('system', next)}
          t={t}
        />

        <div className="border-t border-slate-200/70 dark:border-white/10" />

        <ColorGroup
          title={t('profile.storefrontColors')}
          hint={t('profile.storefrontColorsHint')}
          value={storefront}
          onChange={(next) => onChange('storefront', next)}
          t={t}
        />

        <div className="border-t border-slate-200/70 dark:border-white/10" />

        <ColorGroup
          title={t('profile.storefrontBackground')}
          hint={t('profile.storefrontBackgroundHint')}
          value={storefrontBackground}
          onChange={(next) => onChange('storefrontBackground', next)}
          t={t}
        />

        <div className="border-t border-slate-200/70 dark:border-white/10" />

        <ColorGroup
          title={t('profile.storefrontBackgroundDark')}
          hint={t('profile.storefrontBackgroundDarkHint')}
          value={storefrontBackgroundDark}
          onChange={(next) => onChange('storefrontBackgroundDark', next)}
          t={t}
        />

        <div className="border-t border-slate-200/70 dark:border-white/10" />

        {/* Single swatch, not a primary+shadow pair — the price is flat text,
            not a gradient fill, so there's nothing for a second colour to do. */}
        <SingleColorGroup
          title={t('profile.priceColor')}
          hint={t('profile.priceColorHint')}
          value={priceColor}
          onChange={(next) => onChange('priceColor', next)}
          t={t}
        />
      </div>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        {t('profile.themeSaveHint')}
      </p>
    </section>
  )
}

function ColorGroup({ title, hint, value, onChange, t }) {
  const { primary, shadow } = value
  const update = (field) => (event) =>
    onChange({ primary, shadow, [field]: event.target.value })

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Capped width: full-bleed hint lines ran the width of the card and
            made the group read as loose prose rather than a labelled control. */}
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            {/* A live dot of the group's own colour, so each group is
                identifiable before reading its title. */}
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: primary }}
            />
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="h-12 w-full rounded-2xl sm:w-44"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${shadow})`,
            boxShadow: `0 12px 28px ${shadow}66`,
          }}
        />
      </div>

      <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
        <ColorField
          label={t('profile.primaryColor')}
          value={primary}
          onChange={update('primary')}
        />
        <ColorField
          label={t('profile.shadowColor')}
          value={shadow}
          onChange={update('shadow')}
        />
      </div>
    </div>
  )
}

/**
 * A single flat colour (the price text) instead of a primary+shadow pair —
 * same layout language as ColorGroup (live dot, title/hint, a preview swatch,
 * one field), just with a solid preview instead of a gradient.
 */
function SingleColorGroup({ title, hint, value, onChange, t }) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: value }}
            />
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-extrabold sm:w-44"
          style={{ background: `${value}1a`, color: value, boxShadow: `0 12px 28px ${value}33` }}
        >
          {formatCurrency(5200)}
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <ColorField label={t('profile.priceColorField')} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="profile-label mb-0 rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
      <span>{label}</span>
      <span className="mt-3 flex items-center gap-3">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={onChange}
          className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <output className="font-mono text-sm normal-case tracking-normal text-slate-700 dark:text-slate-200">
          {String(value).toUpperCase()}
        </output>
      </span>
    </label>
  )
}
