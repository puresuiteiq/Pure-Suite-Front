import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useVerticalT } from '../../hooks/useVerticalT'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import ThemeCustomization from '../../components/merchant/ThemeCustomization'
import ServiceMethodsEditor from '../../components/merchant/ServiceMethodsEditor'
import SplashSettings from '../../components/merchant/SplashSettings'
import StorefrontThemePicker from '../../components/merchant/StorefrontThemePicker'
import { normalizeStorefrontTheme } from '../../config/storefrontThemes'
import { normalizeServiceMethods } from '../../config/serviceMethods'
import ChangePasswordForm from '../../components/auth/ChangePasswordForm'
import { merchantProfileService } from '../../services/merchantProfileService'
import { fileToDataUrl, MAX_DIMENSION } from '../../utils/image'
import { translateApiError } from '../../utils/apiError'
import { isShortMapLink, parseMapCoordinates } from '../../utils/mapLinks'

// Leaflet is a full mapping library (~150kB) used only on this one page —
// lazy-loaded so it stays out of the bundle every other page (including the
// entire public storefront) pays for on load, same pattern as OrdersChart.
const LocationPicker = lazy(() => import('../../components/merchant/LocationPicker'))
const mapSkeleton = <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />

const inputClass =
  'profile-input w-full px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

// Colour-picker starting points when the merchant hasn't chosen their own.
// Storefront = the green the storefront ships with (synced with PublicMenu);
// panel = the amber the admin buttons ship with (synced with MerchantLayout).
const DEFAULT_ACCENT = '#16a34a'
const DEFAULT_ACCENT_SHADOW = '#15803d'
const DEFAULT_PANEL = '#f59e0b'
const DEFAULT_PANEL_SHADOW = '#ea580c'
const DEFAULT_STOREFRONT_BACKGROUND = '#f8fafc'
const DEFAULT_STOREFRONT_BACKGROUND_SHADOW = '#eef2f7'
// Dark-mode picker starting point — the platform's own near-black default
// (matches .public-storefront's base CSS), not a light colour, so opening the
// picker for the first time previews what dark-mode customers already see.
const DEFAULT_STOREFRONT_BACKGROUND_DARK = '#0c0c0e'
const DEFAULT_STOREFRONT_BACKGROUND_SHADOW_DARK = '#17171a'
// Price text colour starting point — the same green as the storefront accent,
// since that's what a price renders as today when a merchant hasn't picked
// one of their own.
const DEFAULT_PRICE_COLOR = '#16a34a'
const EMPTY_SOCIAL_LINKS = {
  instagram: '',
  whatsapp: '',
  snapchat: '',
  facebook: '',
  tiktok: '',
  telegram: '',
}

export default function MerchantProfile() {
  const { t } = useVerticalT()
  const reduceMotion = useReducedMotion()
  const { profile, loading, save } = useMerchantProfile()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [mapLinkResolving, setMapLinkResolving] = useState(false)

  // Seed the editable form once the profile loads.
  useEffect(() => {
    if (profile) {
      setForm({
        businessName: profile.businessName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        mapUrl: profile.mapUrl ?? '',
        description: profile.description ?? '',
        isOpen: profile.isOpen ?? true,
        reviewsEnabled: profile.reviewsEnabled ?? true,
        dailyOrderNumbers: profile.dailyOrderNumbers ?? false,
        accentColor: profile.accentColor ?? DEFAULT_ACCENT,
        accentShadow: profile.accentShadow ?? DEFAULT_ACCENT_SHADOW,
        panelColor: profile.panelColor ?? DEFAULT_PANEL,
        panelShadow: profile.panelShadow ?? DEFAULT_PANEL_SHADOW,
        storefrontBackground: profile.storefrontBackground ?? DEFAULT_STOREFRONT_BACKGROUND,
        storefrontBackgroundShadow: profile.storefrontBackgroundShadow ?? DEFAULT_STOREFRONT_BACKGROUND_SHADOW,
        storefrontBackgroundDark: profile.storefrontBackgroundDark ?? DEFAULT_STOREFRONT_BACKGROUND_DARK,
        storefrontBackgroundShadowDark: profile.storefrontBackgroundShadowDark ?? DEFAULT_STOREFRONT_BACKGROUND_SHADOW_DARK,
        // Falls back to the merchant's own accent (not a flat default) so
        // opening the picker for the first time previews the colour prices
        // already render as today, not an unrelated generic green.
        priceColor: profile.priceColor ?? profile.accentColor ?? DEFAULT_PRICE_COLOR,
        // null (not set) is a real, valid state here — unlike the colour
        // pickers above, there's no sensible default pin position to
        // pre-fill; the map just opens un-pinned until the merchant places one.
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null,
        socialLinks: { ...EMPTY_SOCIAL_LINKS, ...(profile.socialLinks ?? {}) },
        serviceMethods: normalizeServiceMethods(profile.serviceMethods),
        logo: profile.logo ?? null,
        workingHours: profile.workingHours ?? [],
        splashEnabled: profile.splashEnabled ?? false,
        splashTagline: profile.splashTagline ?? '',
        storefrontTheme: normalizeStorefrontTheme(profile.storefrontTheme),
      })
    }
  }, [profile])

  // A confirmation is only true for a moment. Left up, "saved successfully"
  // outlived the save — it previously only cleared once a field was edited, so
  // it could still be sitting there minutes later, describing nothing. The
  // error banner deliberately has no timer: it needs acting on, not noting.
  useEffect(() => {
    if (!saved) return undefined
    const timer = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [saved])

  useEffect(() => {
    if (!form?.mapUrl?.trim()) return undefined
    const url = form.mapUrl.trim()
    let cancelled = false
    const timer = window.setTimeout(async () => {
      const direct = parseMapCoordinates(url)
      if (direct) {
        setForm((prev) =>
          prev
            ? { ...prev, latitude: direct.latitude, longitude: direct.longitude }
            : prev,
        )
        markDirty()
        return
      }
      if (!isShortMapLink(url)) return

      setMapLinkResolving(true)
      try {
        const resolved = await merchantProfileService.resolveMapLink(url)
        if (cancelled) return
        setForm((prev) =>
          prev
            ? {
                ...prev,
                latitude: resolved.latitude,
                longitude: resolved.longitude,
              }
            : prev,
        )
        markDirty()
      } catch {
        // The link itself is still useful for customers even if we cannot infer
        // coordinates for the admin preview map.
      } finally {
        if (!cancelled) setMapLinkResolving(false)
      }
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [form?.mapUrl])

  const markDirty = () => setSaved(false)

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    markDirty()
  }

  const updateHour = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      workingHours: prev.workingHours.map((h, i) =>
        i === index ? { ...h, [field]: value } : h,
      ),
    }))
    markDirty()
  }

  const onLogoSelect = async (e) => {
    const file = e.target.files?.[0]
    // Clear the input so re-picking the same file fires change again.
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setError(null)
    try {
      const logo = await fileToDataUrl(file, { maxDim: MAX_DIMENSION.logo })
      setForm((prev) => ({ ...prev, logo }))
      markDirty()
    } catch (err) {
      setError(translateApiError(err, t))
    }
  }

  const removeLogo = () => {
    setForm((prev) => ({ ...prev, logo: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    markDirty()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await save({
        businessName: form.businessName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        mapUrl: form.mapUrl.trim(),
        description: form.description.trim(),
        isOpen: form.isOpen,
        reviewsEnabled: form.reviewsEnabled,
        dailyOrderNumbers: form.dailyOrderNumbers,
        accentColor: form.accentColor,
        accentShadow: form.accentShadow,
        panelColor: form.panelColor,
        panelShadow: form.panelShadow,
        storefrontBackground: form.storefrontBackground,
        storefrontBackgroundShadow: form.storefrontBackgroundShadow,
        storefrontBackgroundDark: form.storefrontBackgroundDark,
        storefrontBackgroundShadowDark: form.storefrontBackgroundShadowDark,
        priceColor: form.priceColor,
        latitude: form.latitude,
        longitude: form.longitude,
        socialLinks: form.socialLinks,
        serviceMethods: form.serviceMethods,
        logo: form.logo,
        workingHours: form.workingHours,
        splashEnabled: form.splashEnabled,
        splashTagline: form.splashTagline.trim(),
        storefrontTheme: form.storefrontTheme,
      })
      setSaved(true)
    } catch (err) {
      setError(translateApiError(err, t, 'profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <div>
        <PageHeader title={t('profile.title')} />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('profile.loading')}
        </div>
      </div>
    )
  }

  return (
    <>
    <motion.form
      onSubmit={handleSubmit}
      className="merchant-profile"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <PageHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        actions={
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        }
      />

      {/* Portalled to <body> on purpose. This page renders inside
          `.page-enter > *`, whose surface-enter animation uses fill-mode both
          and so leaves `transform: translateY(0)` applied for good — and any
          transform other than none makes that element the containing block for
          position:fixed children. Rendered in place, this would centre itself
          inside the form rather than the screen.
          Centred with inset-0 + flex, never translate-x: `start-1/2` and a
          physical -translate-x cancel out in Arabic (that bug put the
          storefront's toast in the bottom-left corner).
          pointer-events-none so a confirmation that owns the middle of the
          screen still can't swallow a click meant for the page. */}
      {createPortal(
        <AnimatePresence>
          {saved && (
            <motion.div
              key="profile-saved"
              role="status"
              aria-live="polite"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4"
            >
              <div className="luxury-modal flex items-center gap-3.5 rounded-3xl px-6 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-600 dark:text-emerald-300">
                  <Icon name="check" className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('profile.saved')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="profile-glass luxury-card p-4 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t('profile.availability')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('profile.availabilityHint')}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.isOpen}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, isOpen: e.target.checked }))
                  markDirty()
                }}
                className="peer sr-only"
              />
              <span className="relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800" />
              {form.isOpen ? t('profile.open') : t('profile.closed')}
            </label>
          </div>

          {/* Customer ratings on/off. When off, the storefront hides the reviews
              section and won't accept new ratings. */}
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5 dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t('profile.reviews')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('profile.reviewsHint')}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.reviewsEnabled}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, reviewsEnabled: e.target.checked }))
                  markDirty()
                }}
                className="peer sr-only"
              />
              <span className="relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800" />
              {form.reviewsEnabled ? t('profile.reviewsOn') : t('profile.reviewsOff')}
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200/70 pt-5 dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t('profile.dailyOrderNumbers')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('profile.dailyOrderNumbersHint')}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.dailyOrderNumbers}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, dailyOrderNumbers: e.target.checked }))
                  markDirty()
                }}
                className="peer sr-only"
              />
              <span className="relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800" />
              {form.dailyOrderNumbers ? t('profile.dailyOrderNumbersOn') : t('profile.dailyOrderNumbersOff')}
            </label>
          </div>
        </section>

        {/* Business details */}
        <section className="profile-glass luxury-card p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            {t('profile.businessDetails')}
          </h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="profile-label">
                {t('profile.businessName')}
              </span>
              <input
                type="text"
                value={form.businessName}
                onChange={updateField('businessName')}
                placeholder={t('profile.businessNamePlaceholder')}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="profile-label">
                {t('profile.phone')}
              </span>
              <input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={updateField('phone')}
                placeholder={t('profile.phonePlaceholder')}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="profile-label">
                {t('profile.address')}
              </span>
              <input
                type="text"
                value={form.address}
                onChange={updateField('address')}
                placeholder={t('profile.addressPlaceholder')}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="profile-label">
                {t('profile.mapUrl')}
              </span>
              <input
                type="url"
                dir="ltr"
                value={form.mapUrl}
                onChange={updateField('mapUrl')}
                placeholder={t('profile.mapUrlPlaceholder')}
                className={inputClass}
              />
              <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                {mapLinkResolving ? t('profile.mapUrlResolving') : t('profile.mapUrlHint')}
              </span>
            </label>

            {/* Exact map location — separate from the free-text address
                above, which is only ever a label. This is what the public
                storefront's address chip actually links to on Google Maps. */}
            <div className="block">
              <span className="profile-label">{t('profile.location')}</span>
              <Suspense fallback={mapSkeleton}>
                <LocationPicker
                  value={{ latitude: form.latitude, longitude: form.longitude }}
                  onChange={({ latitude, longitude }) => {
                    setForm((prev) => ({ ...prev, latitude, longitude }))
                    markDirty()
                  }}
                />
              </Suspense>
            </div>

            <label className="block">
              <span className="profile-label">
                {t('profile.about')}
              </span>
              <textarea
                rows={3}
                value={form.description}
                onChange={updateField('description')}
                placeholder={t('profile.aboutPlaceholder')}
                className={`${inputClass} resize-none`}
              />
            </label>
          </div>
        </section>

        {/* Logo */}
        <section className="profile-glass luxury-card p-4 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t('profile.logo')}
          </h2>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/20 bg-slate-950/35 shadow-inner">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Business logo preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon name="image" className="h-8 w-8 text-slate-300" />
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoSelect}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="upload"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('profile.upload')}
              </Button>
              {form.logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeLogo}
                >
                  {t('common.remove')}
                </Button>
              )}
            </div>
            <p className="text-center text-xs text-slate-400">
              {t('profile.logoHint')}
            </p>
          </div>
        </section>
      </div>

      <section className="profile-glass luxury-card mt-6 p-4 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('profile.socialLinks')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('profile.socialLinksHint')}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['instagram', 'whatsapp', 'snapchat', 'facebook', 'tiktok', 'telegram'].map((network) => (
            <label key={network} className="block">
              <span className="profile-label">{t(`profile.social.${network}`)}</span>
              <input
                type="text"
                dir="ltr"
                value={form.socialLinks?.[network] ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setForm((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, [network]: value },
                  }))
                  markDirty()
                }}
                placeholder={t(`profile.social.${network}Placeholder`)}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Which design the storefront wears. Saves with the rest of the form. */}
      <div className="mt-6">
        <StorefrontThemePicker
          value={form.storefrontTheme}
          onChange={(key) => {
            setForm((prev) => ({ ...prev, storefrontTheme: key }))
            markDirty()
          }}
          accent={form.accentColor}
          accentShadow={form.accentShadow}
          storefrontUrl={
            profile?.slug || profile?.merchantId
              ? `/r/${encodeURIComponent(profile.slug || profile.merchantId)}`
              : null
          }
        />
      </div>

      {/* Storefront welcome screen. Its background uploads on its own; the
          switch and tagline save with the rest of this form. */}
      <div className="mt-6">
        <SplashSettings
          enabled={form.splashEnabled}
          tagline={form.splashTagline}
          onEnabledChange={(value) => {
            setForm((prev) => ({ ...prev, splashEnabled: value }))
            markDirty()
          }}
          onTaglineChange={(value) => {
            setForm((prev) => ({ ...prev, splashTagline: value }))
            markDirty()
          }}
          initialMedia={profile?.splashMedia ?? null}
          preview={{
            logo: form.logo,
            businessName: form.businessName,
            accentColor: form.accentColor,
            accentShadow: form.accentShadow,
          }}
        />
      </div>

      <div className="mt-6">
        <ServiceMethodsEditor
          businessType={profile?.businessType}
          value={form.serviceMethods}
          onChange={(next) => {
            setForm((prev) => ({ ...prev, serviceMethods: next }))
            markDirty()
          }}
        />
      </div>

      <div className="mt-6">
        <ThemeCustomization
          system={{ primary: form.panelColor, shadow: form.panelShadow }}
          storefront={{ primary: form.accentColor, shadow: form.accentShadow }}
          storefrontBackground={{ primary: form.storefrontBackground, shadow: form.storefrontBackgroundShadow }}
          storefrontBackgroundDark={{ primary: form.storefrontBackgroundDark, shadow: form.storefrontBackgroundShadowDark }}
          priceColor={form.priceColor}
          onChange={(group, next) => {
            setForm((prev) => {
              if (group === 'system') return { ...prev, panelColor: next.primary, panelShadow: next.shadow }
              if (group === 'storefront') return { ...prev, accentColor: next.primary, accentShadow: next.shadow }
              if (group === 'storefrontBackgroundDark') {
                return { ...prev, storefrontBackgroundDark: next.primary, storefrontBackgroundShadowDark: next.shadow }
              }
              if (group === 'priceColor') return { ...prev, priceColor: next }
              return { ...prev, storefrontBackground: next.primary, storefrontBackgroundShadow: next.shadow }
            })
            markDirty()
          }}
        />
      </div>

      {/* Working hours */}
      <section className="profile-glass luxury-card mt-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Icon name="clock" className="h-5 w-5 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('profile.workingHours')}
          </h2>
        </div>

        {/* One card per day: name + Open/Closed toggle on top, the time range
            below when open. The toggle is green when Open (matching the
            availability switch) and its label reflects the real state. */}
        {/* grid-cols-1 (minmax(0, 1fr)), not an implicit column: an implicit
            track is as wide as the widest card's content, and two time inputs
            made that ~292px — past a 320px phone's edge. */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {form.workingHours.map((hour, index) => {
            const open = !hour.closed
            return (
              <div
                key={hour.day}
                // min-w-0 on the time inputs plus tighter padding below sm: two
                // time inputs side by side refused to shrink, so on a 320px
                // phone every day's card ran off the screen.
                className={`rounded-2xl border p-3 transition-colors sm:p-4 ${
                  open
                    ? 'border-slate-200/70 dark:border-white/10'
                    : 'border-slate-200/60 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t(`days.${hour.day}`)}
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={open}
                      onChange={(e) => updateHour(index, 'closed', !e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="relative h-6 w-11 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_18px_rgba(16,185,129,.4)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-700" />
                    {open ? t('profile.open') : t('profile.closed')}
                  </label>
                </div>

                <div className="mt-3">
                  {open ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={hour.open}
                        onChange={(e) => updateHour(index, 'open', e.target.value)}
                        className="profile-input min-w-0 flex-1 px-2 py-2 text-sm focus:outline-none sm:px-3"
                      />
                      <span className="shrink-0 text-xs text-slate-400">{t('profile.to')}</span>
                      <input
                        type="time"
                        value={hour.close}
                        onChange={(e) => updateHour(index, 'close', e.target.value)}
                        className="profile-input min-w-0 flex-1 px-2 py-2 text-sm focus:outline-none sm:px-3"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">{t('profile.closed')}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* A second Save at the end, so a long form can be saved without scrolling
          back to the top. */}
      <div className="mt-8 flex flex-col-reverse items-center gap-3 border-t border-slate-200/70 pt-6 sm:flex-row sm:justify-between dark:border-white/10">
        <p className="text-center text-sm text-slate-500 sm:text-start dark:text-slate-400">
          {t('profile.subtitle')}
        </p>
        <Button type="submit" icon="check" disabled={saving} className="sm:w-auto">
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </motion.form>

    {/* Deliberately a SIBLING of the profile form, not a section inside it.
        The profile is one big <motion.form>; nesting a second <form> is invalid
        HTML, and pressing Enter in a password field would submit the profile
        instead of changing the password. Outside it, this card looks identical
        and behaves independently — its own submit, its own error, no shared
        dirty tracking. */}
    <section className="profile-glass luxury-card mt-6 p-4 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900 dark:text-white">
        <span aria-hidden="true" className="h-5 w-1.5 shrink-0 rounded-full bg-brand-600" />
        {t('auth.changePassword')}
      </h2>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        {t('auth.changePasswordSubtitle')}
      </p>
      <div className="mt-5 max-w-md">
        <ChangePasswordForm onSubmit={merchantProfileService.changePassword} />
      </div>
    </section>
    </>
  )
}
