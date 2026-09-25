import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { useVerticalT } from '../../hooks/useVerticalT'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { splashService } from '../../services/splashService'
import { resolveMediaUrl } from '../../services/apiClient'
import { fileToDataUrl } from '../../utils/image'
import { SPLASH_IMAGE_MAX_DIM, assertSplashFile, splashUploadError } from '../../utils/splashMedia'
import { translateApiError } from '../../utils/apiError'

const TAGLINE_MAX = 160

/**
 * Profile section for the storefront welcome screen.
 *
 * The switch and tagline are ordinary form fields, saved with the profile. The
 * background picture/video uploads the moment it is chosen, through its own
 * endpoint — it is too big to ride along with the profile JSON.
 *
 * The uploaded media is kept here and handed to the shared profile only on
 * unmount. MerchantProfile re-seeds its whole form whenever the shared profile
 * changes, so updating it mid-edit would throw away everything the merchant
 * had typed but not yet saved.
 */
export default function SplashSettings({
  enabled,
  tagline,
  onEnabledChange,
  onTaglineChange,
  initialMedia,
  preview,
}) {
  const { t } = useVerticalT()
  const { merge } = useMerchantProfile()
  const inputRef = useRef(null)
  const [media, setMedia] = useState(initialMedia ?? null)
  const [busy, setBusy] = useState(null) // 'upload' | 'remove' | null
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const latest = useRef({ initial: initialMedia ?? null, media: initialMedia ?? null })
  useEffect(() => {
    latest.current.media = media
  }, [media])
  useEffect(
    () => () => {
      if (latest.current.media !== latest.current.initial) merge({ splashMedia: latest.current.media })
    },
    [merge],
  )

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const onSelect = async (event) => {
    const file = event.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setError(null)
    setNotice(null)
    setBusy('upload')
    let body = null
    try {
      const kind = assertSplashFile(file)
      // Pictures are downscaled first, like every other upload; a video can't
      // be re-encoded in the browser, so it goes as chosen.
      body =
        kind === 'video'
          ? file
          : await (
              await fetch(
                await fileToDataUrl(file, { maxDim: SPLASH_IMAGE_MAX_DIM, quality: 0.85, rasterize: true }),
              )
            ).blob()
      const result = await splashService.uploadMedia(body)
      setMedia(result.splashMedia)
      setNotice(t('profile.splash.mediaSaved'))
    } catch (err) {
      setError(translateApiError(splashUploadError(err, body), t))
    } finally {
      setBusy(null)
    }
  }

  const onRemove = async () => {
    setError(null)
    setNotice(null)
    setBusy('remove')
    try {
      const result = await splashService.removeMedia()
      setMedia(result.splashMedia)
      setNotice(t('profile.splash.mediaRemoved'))
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setBusy(null)
    }
  }

  const mediaUrl = media ? resolveMediaUrl(media.url) : null

  return (
    <section className="profile-glass luxury-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('profile.splash.title')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('profile.splash.hint')}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800" />
          {enabled ? t('profile.splash.on') : t('profile.splash.off')}
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-200/70 pt-6 md:grid-cols-[minmax(0,1fr)_auto] dark:border-white/10">
        <div className="space-y-5">
          <label className="block">
            <span className="profile-label">{t('profile.splash.tagline')}</span>
            <input
              type="text"
              value={tagline}
              maxLength={TAGLINE_MAX}
              onChange={(event) => onTaglineChange(event.target.value)}
              placeholder={t('profile.splash.taglinePlaceholder')}
              className="profile-input w-full px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none"
            />
            <span className="mt-1.5 block text-end text-xs tabular-nums text-slate-400">
              {tagline.length}/{TAGLINE_MAX}
            </span>
          </label>

          <div>
            <span className="profile-label">{t('profile.splash.background')}</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={onSelect}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="upload"
                disabled={Boolean(busy)}
                onClick={() => inputRef.current?.click()}
              >
                {busy === 'upload'
                  ? t('profile.splash.uploading')
                  : media
                    ? t('profile.splash.replace')
                    : t('profile.splash.upload')}
              </Button>
              {media && (
                <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} onClick={onRemove}>
                  {busy === 'remove' ? t('common.saving') : t('common.remove')}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{t('profile.splash.backgroundHint')}</p>
            {busy === 'upload' && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('profile.splash.uploadingHint')}</p>
            )}
            {notice && (
              <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Icon name="check" className="h-4 w-4" />
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </p>
            )}
          </div>

          {!enabled && (
            <p className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              {t('profile.splash.offNote')}
            </p>
          )}
        </div>

        <SplashPreview media={media} mediaUrl={mediaUrl} tagline={tagline} {...preview} />
      </div>
    </section>
  )
}

/**
 * A phone-sized sketch of the welcome screen — the real thing's layout in the
 * merchant's current (unsaved) colours, so a change is visible before saving.
 */
function SplashPreview({ media, mediaUrl, tagline, logo, businessName, accentColor, accentShadow }) {
  const { t } = useVerticalT()
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        aria-hidden="true"
        className="relative flex aspect-[9/16] w-44 flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-4 border-slate-900 bg-[#0b0b0d] px-3 text-center text-white shadow-xl sm:w-48 dark:border-slate-700"
        style={{
          '--merchant-primary': accentColor,
          '--merchant-shadow': accentShadow,
          background:
            'radial-gradient(120% 75% at 50% 32%, color-mix(in srgb, var(--merchant-primary) 20%, #2a2522) 0%, #16130f 55%, #0b0b0d 100%)',
        }}
      >
        {mediaUrl &&
          (media.kind === 'video' ? (
            <video src={mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <img src={mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ))}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.5),rgb(0_0_0/0.25)_40%,rgb(0_0_0/0.75))]" />
        <div className="relative flex flex-col items-center">
          {/* Inline white: the panel's dark theme repaints .bg-white. */}
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--merchant-primary)]"
            style={{ backgroundColor: '#fff' }}
          >
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-xl font-black text-slate-800">{(businessName || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="mt-3 text-[9px] font-semibold text-white/80">{t('public.splash.welcome')}</span>
          <span className="mt-0.5 line-clamp-2 text-base font-black leading-tight">{businessName}</span>
          {tagline && <span className="mt-1 line-clamp-2 text-[9px] text-white/80">{tagline}</span>}
          <span
            className="mt-3 rounded-full px-4 py-1.5 text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg, var(--merchant-primary), var(--merchant-shadow))' }}
          >
            {t('public.splash.enter')}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400">{t('profile.splash.preview')}</span>
    </div>
  )
}
