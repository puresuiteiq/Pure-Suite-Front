import { motion, useReducedMotion } from 'framer-motion'
import Icon from '../ui/Icon'
import { useVerticalT } from '../../hooks/useVerticalT'
import { STOREFRONT_THEMES } from '../../config/storefrontThemes'

/**
 * Profile section: which design the storefront wears.
 *
 * Each option is a miniature of that design, drawn in the merchant's own
 * (unsaved) colours, so the choice is made by looking, not by reading a name.
 * The pick saves with the rest of the profile.
 */
export default function StorefrontThemePicker({ value, onChange, accent, accentShadow, storefrontUrl }) {
  const { t } = useVerticalT()
  const reduceMotion = useReducedMotion()
  const colours = { '--pv-accent': accent, '--pv-shadow': accentShadow || accent }

  return (
    <section className="profile-glass luxury-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('profile.storefrontTheme.title')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('profile.storefrontTheme.hint')}</p>
        </div>
        {storefrontUrl && (
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[var(--merchant-primary)] hover:text-[var(--merchant-primary)] dark:border-white/10 dark:text-slate-300"
          >
            <Icon name="eye" className="h-4 w-4" />
            {t('profile.storefrontTheme.view')}
          </a>
        )}
      </div>

      <div role="radiogroup" aria-label={t('profile.storefrontTheme.title')} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {STOREFRONT_THEMES.map((key) => {
          const selected = key === value
          return (
            <motion.button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(key)}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`theme-option relative overflow-hidden rounded-3xl border-2 p-2 text-start transition-colors sm:p-3 ${
                selected
                  ? 'border-[var(--merchant-primary)] shadow-[0_18px_40px_-18px_var(--merchant-primary)]'
                  : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              <div style={colours} className="overflow-hidden rounded-2xl">
                <ThemeMiniature themeKey={key} />
              </div>
              <div className="mt-3 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t(`profile.storefrontTheme.${key}`)}</p>
                  <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t(`profile.storefrontTheme.${key}Hint`)}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selected ? 'accent-surface border-transparent text-white' : 'border-slate-300 dark:border-white/20'
                  }`}
                >
                  {selected && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-slate-400">{t('profile.storefrontTheme.saveNote')}</p>
    </section>
  )
}

/**
 * A few lines, drawn: the look of each design at a glance.
 *
 * Literal colours only (bg-[#ffffff], never bg-white): the merchant panel's
 * dark mode repaints the named palette classes, which turned the modern
 * miniature's white cards dark.
 */
function ThemeMiniature({ themeKey }) {
  const Kit = KIT_MINIATURES[themeKey]
  if (Kit) return <Kit />
  if (themeKey === 'royal') {
    return (
      <div aria-hidden="true" className="h-44 bg-[#0e0c09] px-4 pt-4 text-center">
        <div className="mx-auto h-9 w-9 rounded-full bg-[conic-gradient(var(--pv-accent),#fff,var(--pv-shadow),var(--pv-accent))] p-[2px] shadow-[0_0_0_3px_#0e0c09,0_0_0_4px_var(--pv-accent)]">
          <div className="h-full w-full rounded-full bg-[#ffffff]" />
        </div>
        <div className="mx-auto mt-2 h-2.5 w-20 rounded-full bg-[#f4ecdc]" />
        <div className="mt-1.5 flex items-center justify-center gap-1">
          <span className="h-px w-6 bg-[var(--pv-accent)]" />
          <span className="h-1.5 w-1.5 rotate-45 bg-[var(--pv-accent)]" />
          <span className="h-px w-6 bg-[var(--pv-accent)]" />
        </div>
        <div className="mt-3 space-y-2 text-start">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-2 border-b border-[#2a241a] pb-2">
              <span className="h-6 w-6 shrink-0 rounded-md bg-[#3b3326]" />
              <span className="h-1.5 w-12 rounded-full bg-[#d8ccb4]" />
              <span className="h-0 flex-1 border-b-2 border-dotted border-[var(--pv-accent)] opacity-60" />
              <span className="h-1.5 w-6 rounded-full bg-[var(--pv-accent)]" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (themeKey === 'modern') {
    return (
      <div aria-hidden="true" className="h-44 bg-[#f3f4f8]">
        <div className="h-12 bg-[linear-gradient(135deg,var(--pv-accent),var(--pv-shadow))]" />
        <div className="mx-3 -mt-6 rounded-xl bg-[#ffffff] p-2 shadow-md">
          <div className="flex items-center gap-2">
            <span className="-mt-4 h-8 w-8 rounded-lg border-2 border-[#ffffff] bg-[linear-gradient(135deg,var(--pv-accent),var(--pv-shadow))] shadow" />
            <span className="h-2 w-16 rounded-full bg-[#1e293b]" />
          </div>
          <div className="mt-1.5 flex gap-1">
            <span className="h-2 w-8 rounded-full bg-[#d1fae5]" />
            <span className="h-2 w-6 rounded-full bg-[#f1f5f9]" />
          </div>
        </div>
        <div className="mt-2 flex gap-2 px-3">
          {[0, 1, 2, 3].map((dot) => (
            <span
              key={dot}
              className={`h-6 w-6 rounded-full p-[2px] ${dot === 0 ? 'bg-[var(--pv-accent)]' : 'bg-[#cbd5e1]'}`}
            >
              <span className="block h-full w-full rounded-full border border-[#ffffff] bg-[#e2e8f0]" />
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 px-3">
          {[0, 1].map((card) => (
            <div key={card} className="relative h-12 overflow-hidden rounded-lg bg-[#ffffff] shadow-sm">
              <div className="h-8 bg-[#e2e8f0]" />
              <span className="absolute bottom-1 end-1 h-3.5 w-3.5 rounded bg-[var(--pv-accent)]" />
              <span className="absolute start-1 top-5 h-2 w-7 rounded-full bg-[#ffffff]" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  // Classic
  return (
    <div aria-hidden="true" className="h-44 bg-[#0c0c0e] p-3">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg bg-[linear-gradient(135deg,var(--pv-accent),var(--pv-shadow))]" />
        <span className="h-2 w-16 rounded-full bg-[#e2e8f0]" />
      </div>
      <div className="mt-2.5 h-10 rounded-xl bg-[#1c1c20]" />
      <div className="mt-2 flex gap-1.5">
        {[0, 1, 2].map((tile) => (
          <span key={tile} className="h-7 w-7 rounded-md bg-[#2b2b30]" />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[0, 1].map((card) => (
          <div key={card} className="rounded-lg border border-[color-mix(in_srgb,var(--pv-accent)_30%,transparent)] bg-[#17171a] p-1">
            <div className="h-5 rounded bg-[#2b2b30]" />
            <span className="mt-1 block h-1.5 w-8 rounded-full bg-[var(--pv-accent)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* Kit designs. Same rule: literal colours only. */

function Rows({ line, text, price, photo, dashed = false, card = '' }) {
  return (
    <div className="space-y-1.5">
      {[0, 1].map((row) => (
        <div key={row} className={`flex items-center gap-2 ${card} ${dashed ? '' : `border-b pb-1.5 ${line}`}`}>
          <span className="flex-1 space-y-1">
            <span className={`block h-1.5 w-14 rounded-full ${text}`} />
            <span className={`block h-1.5 w-8 rounded-full ${price}`} />
          </span>
          <span className={`h-7 w-7 shrink-0 rounded-lg ${photo}`} />
        </div>
      ))}
    </div>
  )
}

function PureMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#fafaf9] p-3">
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-xl bg-[#ffffff] shadow-[0_0_0_1px_#e7e5e4]" />
        <span className="h-2.5 w-16 rounded-full bg-[#0a0a0a]" />
      </div>
      <div className="mt-2.5 flex gap-1">
        <span className="h-4 w-10 rounded-full bg-[#0a0a0a]" />
        <span className="h-4 w-10 rounded-full shadow-[inset_0_0_0_1px_#e7e5e4]" />
        <span className="h-4 w-10 rounded-full shadow-[inset_0_0_0_1px_#e7e5e4]" />
      </div>
      <div className="mt-3">
        <Rows line="border-[#e7e5e4]" text="bg-[#262626]" price="bg-[var(--pv-accent)]" photo="bg-[#e7e5e4]" />
      </div>
    </div>
  )
}

function CafeMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#f3e9da] p-3 text-center">
      <span className="mx-auto block h-9 w-8 rounded-b-md rounded-t-full border-2 border-[#fffaf2] bg-[#ffffff] shadow-[0_0_0_1px_#d9c4a6]" />
      <span className="mx-auto mt-1.5 block h-2 w-16 rounded-full bg-[#2b1d12]" />
      <span className="mx-auto mt-1 block h-1 w-10 bg-[radial-gradient(circle,var(--pv-accent)_1.5px,transparent_2px)] bg-[length:6px_4px]" />
      <div className="mt-2.5 text-start">
        <Rows
          dashed
          card="rounded-lg border border-dashed border-[#d9c4a6] bg-[#fffaf2] p-1.5"
          line=""
          text="bg-[#5b4330]"
          price="bg-[var(--pv-accent)]"
          photo="bg-[#e9dac3]"
        />
      </div>
    </div>
  )
}

const NEON_GRID = {
  backgroundImage:
    'linear-gradient(transparent 92%, color-mix(in srgb, var(--pv-accent) 50%, transparent) 92%), linear-gradient(90deg, transparent 92%, color-mix(in srgb, var(--pv-accent) 50%, transparent) 92%)',
  backgroundSize: '100% 14px, 14px 100%',
}

function NeonMini() {
  return (
    <div aria-hidden="true" className="relative h-44 overflow-hidden bg-[#07060d] p-3 text-center" style={NEON_GRID}>
      <span className="mx-auto block h-9 w-9 rounded-full bg-[#ffffff] shadow-[0_0_0_2px_var(--pv-accent),0_0_16px_2px_var(--pv-accent)]" />
      <span className="mx-auto mt-2 block h-2.5 w-20 rounded-full bg-[linear-gradient(90deg,#fff,var(--pv-accent),#fff)] shadow-[0_0_12px_var(--pv-accent)]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((card) => (
          <div key={card} className="h-14 rounded-lg border border-[color-mix(in_srgb,var(--pv-accent)_45%,transparent)] bg-[#ffffff14] p-1">
            <div className="h-8 rounded bg-[#ffffff1f]" />
            <span className="mt-1 block h-1.5 w-8 rounded-full bg-[var(--pv-accent)] shadow-[0_0_8px_var(--pv-accent)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MagazineMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#fbfaf7]">
      <div className="relative h-20 bg-[linear-gradient(160deg,#8a5a2b,#2a1d12)]">
        <span className="absolute bottom-2 start-3 h-3 w-24 rounded-full bg-[#ffffff]" />
        <span className="absolute bottom-6 start-3 h-1.5 w-10 rounded-full bg-[var(--pv-accent)]" />
      </div>
      <div className="flex gap-2 border-b border-[#e6e1d8] px-3 py-1.5">
        <span className="h-1.5 w-8 rounded-full bg-[#111111]" />
        <span className="h-1.5 w-8 rounded-full bg-[#b8b2a7]" />
      </div>
      <div className="flex items-end gap-2 px-3 pt-2">
        <span className="font-serif text-2xl leading-none text-transparent [-webkit-text-stroke:1px_var(--pv-accent)]">01</span>
        <span className="mb-1 h-2 w-14 rounded-full bg-[#111111]" />
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 px-3">
        <span className="h-7 rounded bg-[#d6cfc2]" />
        <span className="h-7 rounded bg-[#d6cfc2]" />
        <span className="h-7 rounded bg-[#d6cfc2]" />
      </div>
    </div>
  )
}

function StreetMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#fff4d6] p-3">
      <div className="flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[linear-gradient(135deg,var(--pv-accent),var(--pv-shadow))] p-2 shadow-[3px_3px_0_#111111]">
        <span className="h-7 w-7 rounded-md border-2 border-[#111111] bg-[#ffffff]" />
        <span className="h-2.5 w-14 rounded-full bg-[#ffffff] shadow-[1px_1px_0_#111111]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((card) => (
          <div key={card} className="relative h-16 rounded-lg border-2 border-[#111111] bg-[#ffffff] shadow-[3px_3px_0_#111111]">
            <div className="h-9 border-b-2 border-[#111111] bg-[#e8dcc2]" />
            <span className="absolute bottom-7 end-1 h-2.5 w-7 -rotate-6 rounded-full border border-[#111111] bg-[#ffe14d]" />
            <span className="absolute bottom-1 end-1 h-3.5 w-3.5 rounded border border-[#111111] bg-[var(--pv-accent)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function GardenMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#eef3ea] p-3 text-center">
      <span className="mx-auto block h-9 w-9 border-2 border-[#ffffff] bg-[#ffffff] shadow-[0_0_0_1px_var(--pv-accent)] [border-radius:58%_42%_55%_45%/45%_55%_45%_55%]" />
      <span className="mx-auto mt-1.5 block h-2 w-16 rounded-full bg-[#1e2a1b]" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((card) => (
          <div key={card} className="rounded-2xl bg-[#ffffff] p-1.5">
            <span className="mx-auto block h-9 w-9 rounded-full border-2 border-[#e2ebdc] bg-[#c9d8bf]" />
            <span className="mx-auto mt-1 block h-1.5 w-10 rounded-full bg-[#1e2a1b]" />
            <span className="mx-auto mt-1 block h-3 w-3 rounded-full bg-[var(--pv-accent)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function BoutiqueMini() {
  return (
    <div aria-hidden="true" className="h-44 bg-[#ffffff] p-3 text-center">
      <span className="mx-auto block h-7 w-7 rounded-full shadow-[0_0_0_1px_#e4e4e7]" />
      <span className="mx-auto mt-1.5 block h-2 w-16 rounded-full bg-[#0a0a0a]" />
      <span className="mx-auto mt-1.5 block h-px w-6 bg-[#0a0a0a]" />
      <div className="mt-3 grid grid-cols-2 gap-2 text-start">
        {[0, 1].map((card) => (
          <div key={card}>
            <div className="h-14 rounded-sm bg-[#e4e4e7]" />
            <span className="mt-1 block h-1.5 w-10 rounded-full bg-[#27272a]" />
            <span className="mt-1 block h-1.5 w-6 rounded-full bg-[var(--pv-accent)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

const KIT_MINIATURES = {
  pure: PureMini,
  cafe: CafeMini,
  neon: NeonMini,
  magazine: MagazineMini,
  street: StreetMini,
  garden: GardenMini,
  boutique: BoutiqueMini,
}
