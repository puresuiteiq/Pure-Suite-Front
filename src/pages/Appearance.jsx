import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { adminAppearanceService } from '../services/adminAppearanceService'
import { usePlatformBranding } from '../hooks/usePlatformBranding'
import { translateApiError } from '../utils/apiError'
import { fileToDataUrl, MAX_DIMENSION } from '../utils/image'
import {
  applyAccentVars,
  DEFAULT_ADMIN_ACCENT,
  DEFAULT_ADMIN_SHADOW,
} from '../utils/accent'
import defaultPlatformLogo from '../assets/picture/logo1.png'

// Swatch shown while a colour hasn't been customised yet — matches the
// footer's own fallback classes (text-slate-400 / text-slate-500) so the
// picker's starting point looks like "not customised", not an arbitrary hue.
const DEFAULT_POWERED_BY_COLOR = '#94a3b8'
const DEFAULT_PLATFORM_NAME_COLOR = '#64748b'

/**
 * Super Admin appearance settings — lets the platform owner colour their own
 * dashboard buttons. Colours persist in the DB (per admin) and preview live as
 * the pickers move, so the whole panel recolours before saving.
 */
export default function Appearance() {
  const { t } = useTranslation()
  const { setBranding } = usePlatformBranding()
  const [primary, setPrimary] = useState(DEFAULT_ADMIN_ACCENT)
  const [shadow, setShadow] = useState(DEFAULT_ADMIN_SHADOW)
  const [publicBrandLogo, setPublicBrandLogo] = useState(null)
  const [publicPoweredByText, setPublicPoweredByText] = useState('')
  const [publicBrandName, setPublicBrandName] = useState('')
  const [publicPoweredByColor, setPublicPoweredByColor] = useState(null)
  const [publicBrandNameColor, setPublicBrandNameColor] = useState(null)
  const [publicContactWhatsapp, setPublicContactWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const logoInputRef = useRef(null)

  useEffect(() => {
    adminAppearanceService
      .get()
      .then((a) => {
        setPrimary(a.accentColor || DEFAULT_ADMIN_ACCENT)
        setShadow(a.accentShadow || DEFAULT_ADMIN_SHADOW)
        setPublicBrandLogo(a.publicBrandLogo || null)
        setPublicPoweredByText(a.publicPoweredByText || '')
        setPublicBrandName(a.publicBrandName || '')
        setPublicPoweredByColor(a.publicPoweredByColor || null)
        setPublicBrandNameColor(a.publicBrandNameColor || null)
        setPublicContactWhatsapp(a.publicContactWhatsapp || '')
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  // Live preview: recolour the whole panel as the pickers move.
  useEffect(() => {
    if (!loading) applyAccentVars(primary, shadow)
  }, [primary, shadow, loading])

  useEffect(() => {
    if (!saved) return undefined
    const timer = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(timer)
  }, [saved])

  // This had no catch and the page had no error state, so a rejected save --
  // including a payload-too-large from an oversized brand logo -- left an
  // unhandled rejection and a UI indistinguishable from success.
  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const a = await adminAppearanceService.update({
        accentColor: primary,
        accentShadow: shadow,
        publicBrandLogo,
        publicPoweredByText,
        publicBrandName,
        publicPoweredByColor,
        publicBrandNameColor,
        publicContactWhatsapp,
      })
      const p = a.accentColor || DEFAULT_ADMIN_ACCENT
      const s = a.accentShadow || DEFAULT_ADMIN_SHADOW
      setPrimary(p)
      setShadow(s)
      setPublicBrandLogo(a.publicBrandLogo || null)
      setPublicPoweredByText(a.publicPoweredByText || '')
      setPublicBrandName(a.publicBrandName || '')
      setPublicPoweredByColor(a.publicPoweredByColor || null)
      setPublicBrandNameColor(a.publicBrandNameColor || null)
      setPublicContactWhatsapp(a.publicContactWhatsapp || '')
      setBranding({
        logo: a.publicBrandLogo || null,
        poweredByText: a.publicPoweredByText || null,
        name: a.publicBrandName || null,
        poweredByColor: a.publicPoweredByColor || null,
        nameColor: a.publicBrandNameColor || null,
        whatsapp: a.publicContactWhatsapp || null,
      })
      applyAccentVars(p, s)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setPrimary(DEFAULT_ADMIN_ACCENT)
    setShadow(DEFAULT_ADMIN_SHADOW)
  }

  const chooseLogo = async (event) => {
    const file = event.target.files?.[0]
    if (logoInputRef.current) logoInputRef.current.value = ''
    if (!file) return
    setError(null)
    try {
      setPublicBrandLogo(await fileToDataUrl(file, { maxDim: MAX_DIMENSION.logo }))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('appearance.title')}
        subtitle={t('appearance.subtitle')}
      />

      {error && (
        <p
          role="alert"
          className="mx-auto mb-4 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
        >
          {translateApiError(error, t)}
        </p>
      )}

      {/* mx-auto: without it, a max-w'd block just sits at its default
          inline-start edge — the right side in this RTL page — leaving the
          rest of the row empty instead of reading as a deliberately centred
          settings column (the standard "narrow column, wide page" pattern
          for a settings screen like this one). */}
      <section className="luxury-glass luxury-card mx-auto max-w-2xl rounded-3xl p-6">
        {/* Preview */}
        <div
          aria-hidden="true"
          className="flex h-24 items-center justify-center rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${primary}, ${shadow})`,
            boxShadow: `0 14px 32px ${shadow}66`,
          }}
        >
          <span className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            {t('appearance.preview')}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ColorField label={t('profile.primaryColor')} value={primary} onChange={setPrimary} />
          <ColorField label={t('profile.shadowColor')} value={shadow} onChange={setShadow} />
        </div>

        {/* justify-center: the row previously hugged the card's start edge,
            leaving a lopsided gap on the other side — same "not centred"
            complaint as the card itself needing mx-auto earlier. */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={save} disabled={saving || loading} icon="check">
            {saving ? t('common.saving') : t('common.save')}
          </Button>
          {/* Icon coloured via accent-text (var(--merchant-primary), the
              admin's own picked accent — applyAccentVars sets it on <html>
              above) rather than through Button's `icon` prop, which just
              inherits the button's plain slate text colour — the request was
              specifically for a coloured icon, not a coloured button. */}
          <Button variant="secondary" onClick={reset} disabled={saving}>
            <Icon name="refresh" className="accent-text h-5 w-5" />
            {t('appearance.reset')}
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-400">{t('appearance.hint')}</p>

        <section className="mt-8 border-t border-slate-200/70 pt-7 dark:border-white/10">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-white">
            <span aria-hidden="true" className="h-5 w-1.5 shrink-0 rounded-full bg-brand-600" />
            {t('appearance.publicBrandingTitle')}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t('appearance.publicBrandingHint')}
          </p>

          {/* Live preview — mirrors PoweredBy.jsx exactly (same markup/classes,
              colours applied inline) so what the admin sees here is what
              customers see on every storefront, not an approximation. A
              corner tag instead of a full dashed header strip — the dashed
              border read as an unfinished placeholder rather than a deliberate
              "here's a live preview" card. */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm dark:border-white/10 dark:bg-slate-950/20">
            <span className="absolute start-4 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-white/15">
              {t('appearance.footerPreviewLabel')}
            </span>
            <div className="flex items-center justify-center gap-2 py-9">
              <span className="text-xs font-medium" style={{ color: publicPoweredByColor || DEFAULT_POWERED_BY_COLOR }}>
                {publicPoweredByText || t('public.poweredBy')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <img src={publicBrandLogo || defaultPlatformLogo} alt="" className="h-9 w-auto max-w-[130px] object-contain" />
                <span className="text-sm font-semibold" style={{ color: publicBrandNameColor || DEFAULT_PLATFORM_NAME_COLOR }}>
                  {publicBrandName || 'RestoSaaS'}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <BrandTextField
              icon="pencil"
              label={t('appearance.poweredByLabel')}
              colorLabel={t('appearance.poweredByColorLabel')}
              clearLabel={t('appearance.clearColor')}
              value={publicPoweredByText}
              onChange={setPublicPoweredByText}
              placeholder={t('public.poweredBy')}
              maxLength={80}
              color={publicPoweredByColor}
              defaultColor={DEFAULT_POWERED_BY_COLOR}
              onColorChange={setPublicPoweredByColor}
            />
            <BrandTextField
              icon="store"
              label={t('appearance.platformNameLabel')}
              colorLabel={t('appearance.platformNameColorLabel')}
              clearLabel={t('appearance.clearColor')}
              value={publicBrandName}
              onChange={setPublicBrandName}
              placeholder="RestoSaaS"
              maxLength={120}
              color={publicBrandNameColor}
              defaultColor={DEFAULT_PLATFORM_NAME_COLOR}
              onColorChange={setPublicBrandNameColor}
            />
          </div>

          {/* The number behind "Tap here" in the "Designed by …" credit on
              every storefront welcome screen. Blank = the credit shows alone. */}
          <label className="mt-4 block rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
            <span className="profile-label">{t('appearance.contactWhatsappLabel')}</span>
            <div className="relative mt-3">
              <Icon name="phone" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="tel"
                dir="ltr"
                value={publicContactWhatsapp}
                onChange={(event) => setPublicContactWhatsapp(event.target.value)}
                placeholder="+964 750 000 0000"
                maxLength={40}
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pe-4 ps-10 text-sm font-semibold normal-case tracking-normal text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 focus:border-[color:var(--merchant-primary)] focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:bg-slate-950/60"
              />
            </div>
            <p className="mt-2 text-xs normal-case tracking-normal text-slate-400">{t('appearance.contactWhatsappHint')}</p>
          </label>

          {/* Always shows a logo — the custom one, or the platform default —
              instead of only appearing once a custom logo exists, so there's
              always an immediate answer to "what's set right now", matching
              the live-preview card above it. Upload is the primary action
              here (it was a plain secondary button before); "use default" is
              a ghost button since reverting is the less common path. */}
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
            <span className="profile-label">{t('appearance.platformLogoLabel')}</span>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/70 dark:border-white/15 dark:bg-slate-950/30">
                <img src={publicBrandLogo || defaultPlatformLogo} alt="" className="h-12 w-24 object-contain" />
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={chooseLogo} className="hidden" />
              {/* grow + basis-40 instead of flex-1: with a zero basis this group
                  never wrapped under the logo preview, so on a 360px phone it
                  squeezed "Upload logo" onto two lines instead. */}
              <div className="flex grow basis-40 flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                <Button type="button" icon="upload" className="whitespace-nowrap" onClick={() => logoInputRef.current?.click()}>
                  {t('appearance.uploadLogo')}
                </Button>
                {publicBrandLogo && (
                  // A plain <button>, not the shared <Button> — its variants
                  // all set their own bg-*/text-* utilities, which fight a
                  // className override at the same Tailwind layer with no
                  // guaranteed winner (the same cascade risk flagged
                  // elsewhere in this codebase). One flat red pill instead
                  // of a red icon square floating next to plain text.
                  <button
                    type="button"
                    onClick={() => { setPublicBrandLogo(null); if (logoInputRef.current) logoInputRef.current.value = '' }}
                    className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    {t('appearance.removeLogo')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* Centred "Saved" confirmation — was an inline checkmark sitting next
          to the buttons, easy to miss. Portalled + fixed so it centres on the
          actual viewport regardless of where this card sits on the page, and
          auto-dismisses via the `saved` timeout above (2s). Light card (white,
          soft border/shadow) — a dark near-black toast was the wrong call on
          a panel that's light-themed throughout with no dark mode of its own. */}
      {createPortal(
        <AnimatePresence>
          {saved && (
            <motion.div
              className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-6 py-4 text-slate-900 shadow-[0_20px_50px_-12px_rgb(15_23_42_/_0.25)]"
                initial={{ scale: 0.9, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60">
                  <Icon name="check" className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{t('appearance.saved')}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

/**
 * A branding text field paired with the colour it renders in on the public
 * footer — the two live in one card since they're one decision ("this text,
 * in this colour"), not two unrelated settings. `color` is null until the
 * admin actually picks one (the footer then falls back to its own default
 * slate tone); the swatch just previews `defaultColor` until touched.
 *
 * The input itself is a bespoke design (not the shared `.profile-input` pill)
 * — a leading icon, a live character counter, and a focus ring in the admin's
 * own accent colour (--merchant-primary, already applied to this page) so it
 * ties into the panel's own branding instead of a generic form field.
 */
function BrandTextField({ icon, label, colorLabel, clearLabel, value, onChange, placeholder, maxLength, color, defaultColor, onColorChange }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
      <label className="profile-label mb-0 block">
        <span>{label}</span>
        <div className="relative mt-3">
          <Icon name={icon} className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 ps-10 pe-14 text-sm font-semibold normal-case tracking-normal text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-slate-400 focus:border-[color:var(--merchant-primary)] focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--merchant-primary)_16%,transparent)] dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:bg-slate-950/60"
          />
          <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-slate-300 dark:text-slate-600">
            {value.length}/{maxLength}
          </span>
        </div>
      </label>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
        <span className="flex items-center gap-2.5">
          <input
            aria-label={colorLabel}
            type="color"
            value={color || defaultColor}
            onChange={(event) => onColorChange(event.target.value)}
            className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{colorLabel}</span>
        </span>
        {color && (
          <button
            type="button"
            onClick={() => onColorChange(null)}
            className="text-xs font-medium text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:hover:text-slate-200"
          >
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="profile-label mb-0 block rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
      <span>{label}</span>
      <span className="mt-3 flex items-center gap-3">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <output className="font-mono text-sm normal-case tracking-normal text-slate-700 dark:text-slate-200">
          {String(value).toUpperCase()}
        </output>
      </span>
    </label>
  )
}
