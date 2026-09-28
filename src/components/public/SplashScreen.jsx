import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Icon from '../ui/Icon'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { useVerticalT } from '../../hooks/useVerticalT'
import { buildWhatsAppUrl } from '../../utils/order'

/**
 * The storefront's welcome screen: the merchant's logo, name and tagline over
 * their own picture or video, with one button into the menu.
 *
 * It opens on a programmed intro — corner marks drawing in, accent-coloured
 * orbs, the logo arriving with a pulse — and only then fades the background
 * media in, once the intro has played AND the media can actually be shown. So
 * a slow connection never shows a half-loaded video, and a background that
 * fails to load leaves the animated screen, never a broken one.
 *
 * Portalled to <body>: `.public-storefront` forces `position: relative` on its
 * direct children, which would lay a fixed overlay out inline in the page.
 */

/** How long the intro plays before the background media may fade in. */
const INTRO_MS = 1500

/**
 * How long a picture (or the animated background alone) stays after the
 * intro before the store opens by itself. A video instead opens the store
 * when it ends.
 */
const AUTO_ENTER_MS = 6000

/** The "designed by" credit if the API sent no platform name (PLATFORM_NAME). */
const DEFAULT_CREDIT_NAME = 'Pure Suite'

/**
 * Pure Suite's own WhatsApp, behind "Tap here" in the credit. The Super
 * Admin's "Designer WhatsApp number" (Appearance) overrides it when set.
 */
const DEFAULT_CREDIT_WHATSAPP = '9647849880268'

// Deterministic, so the screen looks the same on every visit (and every render).
const ORBS = [
  { top: '8%', left: '18%', size: 90, delay: 0.1, drift: 18 },
  { top: '14%', left: '78%', size: 60, delay: 0.5, drift: 14 },
  { top: '30%', left: '6%', size: 46, delay: 0.9, drift: 12 },
  { top: '38%', left: '88%', size: 110, delay: 0.3, drift: 22 },
  { top: '55%', left: '28%', size: 70, delay: 0.7, drift: 16 },
  { top: '62%', left: '70%', size: 84, delay: 0.2, drift: 20 },
  { top: '76%', left: '10%', size: 58, delay: 1.1, drift: 14 },
  { top: '84%', left: '52%', size: 40, delay: 0.6, drift: 10 },
  { top: '88%', left: '86%', size: 66, delay: 0.4, drift: 16 },
]

// Corner marks: one path, placed and mirrored per corner. Physical left/right,
// not start/end — the mirroring is physical, so logical placement would point
// every mark the wrong way in Arabic.
const CORNERS = [
  'top-6 left-6 sm:top-8 sm:left-8',
  'top-6 right-6 -scale-x-100 sm:top-8 sm:right-8',
  'bottom-6 left-6 -scale-y-100 sm:bottom-8 sm:left-8',
  'bottom-6 right-6 -scale-100 sm:bottom-8 sm:right-8',
]

export default function SplashScreen({ open, profile, branding, menuLoading = false, onEnter }) {
  return createPortal(
    <AnimatePresence>
      {open && <SplashContent key="splash" profile={profile} branding={branding} menuLoading={menuLoading} onEnter={onEnter} />}
    </AnimatePresence>,
    document.body,
  )
}

function SplashContent({ profile, branding, menuLoading, onEnter }) {
  const { t } = useVerticalT()
  const reduceMotion = useReducedMotion()
  const videoRef = useRef(null)
  const [introDone, setIntroDone] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  // A video that can't play (a broken file, autoplay refused in Low Power
  // Mode) falls back to the timed entry a picture gets.
  const [videoFailed, setVideoFailed] = useState(false)
  // 0..1 through the video, for the progress line.
  const [videoProgress, setVideoProgress] = useState(0)

  const media = profile.splashMedia
  const businessName = profile.businessName || t('public.businessFallback')
  const showMedia = Boolean(media) && introDone && mediaReady
  const playsVideo = media?.kind === 'video' && !videoFailed

  // Entering happens once, whether from the button, the video ending or the timer.
  const entered = useRef(false)
  const enter = useCallback(() => {
    if (entered.current) return
    entered.current = true
    onEnter()
  }, [onEnter])

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroDone(true), reduceMotion ? 0 : INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [reduceMotion])

  // The progress bar opens the store when it completes. This fallback only
  // covers browsers that pause CSS/animation callbacks while the tab is busy.
  useEffect(() => {
    if (!introDone || playsVideo) return undefined
    const timer = window.setTimeout(enter, AUTO_ENTER_MS + 250)
    return () => window.clearTimeout(timer)
  }, [introDone, playsVideo, enter])

  // The video autoplays hidden during the intro so it is buffered; rewind it
  // the moment it is revealed, so customers see it from the first frame.
  useEffect(() => {
    const video = videoRef.current
    if (!showMedia || !video) return
    video.currentTime = 0
    video.play?.().catch(() => setVideoFailed(true))
  }, [showMedia])

  // The menu underneath must not scroll behind the screen.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // React sets `muted` as a property only, and iOS Safari decides whether a
  // video may autoplay from muted-ness at the moment play() is called — so set
  // it explicitly and start playback by hand. A refused play() (Low Power Mode)
  // just leaves the animated background.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play?.().catch(() => setVideoFailed(true))
  }, [media?.url])

  // platformName, not the footer's `name` — that is a footer label and can
  // read "POWERED BY".
  const creditName = branding?.platformName || DEFAULT_CREDIT_NAME
  const creditHref = buildWhatsAppUrl(
    branding?.whatsapp || DEFAULT_CREDIT_WHATSAPP,
    t('public.splash.contactMessage', { name: businessName }),
  )

  // One staggered entrance for the content column.
  const rise = (delay) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <motion.div
      translate="no"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      className="notranslate fixed inset-0 z-[70] flex flex-col overflow-hidden bg-[#0b0b0d] text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {/* Base glow, tinted by the merchant's own colour. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 75% at 50% 32%, color-mix(in srgb, var(--merchant-primary) 20%, #2a2522) 0%, #16130f 55%, #0b0b0d 100%)',
        }}
      />

      {/* Background media, mounted from the start so it buffers during the intro. */}
      {media && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
          animate={showMedia ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {media.kind === 'video' ? (
            <video
              ref={videoRef}
              src={media.url}
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              onCanPlay={() => setMediaReady(true)}
              onError={() => setVideoFailed(true)}
              // Plays once, then the store opens. Only once it is on screen:
              // a short clip can finish while still hidden behind the intro,
              // and it is replayed from the start when revealed.
              onTimeUpdate={(event) => {
                const { currentTime, duration } = event.currentTarget
                if (showMedia && duration) setVideoProgress(currentTime / duration)
              }}
              onEnded={() => showMedia && enter()}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={media.url}
              alt=""
              decoding="async"
              onLoad={() => setMediaReady(true)}
              className="h-full w-full object-cover"
            />
          )}
          {/* Scrim: darker top and bottom, so white text reads on any picture. */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.55),rgb(0_0_0/0.3)_38%,rgb(0_0_0/0.35)_60%,rgb(0_0_0/0.8))]" />
        </motion.div>
      )}

      {/* Floating orbs. Radial gradients, not filter: blur, which costs a phone
          a repaint per frame. They quieten once the media is showing. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: showMedia ? 0.35 : 1 }}
        transition={{ duration: 1.2 }}
      >
        {ORBS.map((orb, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              background:
                'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--merchant-primary) 60%, transparent), color-mix(in srgb, var(--merchant-primary) 12%, transparent) 60%, transparent 72%)',
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={
              reduceMotion
                ? { opacity: 0.45, scale: 1 }
                : { opacity: [0, 0.55, 0.4], scale: 1, y: [0, -orb.drift, 0], x: [0, orb.drift / 2, 0] }
            }
            transition={
              reduceMotion
                ? { duration: 0.4 }
                : {
                    opacity: { delay: orb.delay, duration: 1.6 },
                    scale: { delay: orb.delay, duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                    y: { delay: orb.delay, duration: 7 + index, repeat: Infinity, ease: 'easeInOut' },
                    x: { delay: orb.delay, duration: 9 + index, repeat: Infinity, ease: 'easeInOut' },
                  }
            }
          />
        ))}
      </motion.div>

      {/* Corner marks, drawn in. */}
      {CORNERS.map((position) => (
        <svg
          key={position}
          aria-hidden="true"
          viewBox="0 0 64 64"
          className={`pointer-events-none absolute h-12 w-12 sm:h-16 sm:w-16 ${position}`}
          fill="none"
        >
          <motion.path
            d="M2 62 V14 A12 12 0 0 1 14 2 H62"
            stroke="var(--merchant-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.75 }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
          />
        </svg>
      ))}

      {/* Centred at the top, clear of the corner marks. */}
      <div className="absolute inset-x-0 top-5 z-10 flex justify-center sm:top-7">
        <LanguageSwitcher tone="dark" />
      </div>

      {/* Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-4 pt-20 text-center">
        <motion.div
          className="relative mb-10"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduceMotion ? { duration: 0.3 } : { delay: 0.15, type: 'spring', stiffness: 170, damping: 16 }
          }
        >
          {/* Pulse rings */}
          {!reduceMotion &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-[var(--merchant-primary)]"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.55], opacity: [0.6, 0] }}
                transition={{ delay: 0.6 + ring * 1.1, duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
          <span
            aria-hidden="true"
            className="absolute -inset-4 rounded-full border border-[color-mix(in_srgb,var(--merchant-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--merchant-primary)_8%,transparent)]"
          />
          <div
            className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-[var(--merchant-primary)] bg-white sm:h-32 sm:w-32"
            style={{ boxShadow: '0 0 40px -6px color-mix(in srgb, var(--merchant-primary) 70%, transparent)' }}
          >
            {profile.logo ? (
              <img src={profile.logo} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-4xl font-black text-slate-800">{businessName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </motion.div>

        {/* Letter tracking for Latin script only: in Arabic and Kurdish it
            pulls letters apart and breaks their joins, so RTL gets wider word
            spacing instead. */}
        <motion.p
          {...rise(0.45)}
          className="text-xs font-semibold uppercase tracking-[0.25em] text-white/85 sm:text-sm rtl:text-sm rtl:normal-case rtl:tracking-normal rtl:[word-spacing:0.35em] sm:rtl:text-base"
        >
          {t('public.splash.welcome')}
        </motion.p>

        <motion.h1
          id="splash-title"
          {...rise(0.6)}
          className="mt-2 max-w-3xl break-words text-4xl font-black leading-tight tracking-tight drop-shadow-[0_4px_18px_rgb(0_0_0/0.45)] sm:text-6xl"
        >
          {businessName}
        </motion.h1>

        {profile.splashTagline && (
          <motion.p
            {...rise(0.75)}
            className="mt-4 max-w-xl text-base font-medium text-white/85 drop-shadow-[0_2px_10px_rgb(0_0_0/0.5)] sm:text-xl"
          >
            {profile.splashTagline}
          </motion.p>
        )}

        <motion.div
          {...rise(0.9)}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
        >
          <motion.button
            type="button"
            onClick={enter}
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            className="group inline-flex items-center gap-3 rounded-full px-10 py-4 text-lg font-bold text-white outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:px-12 sm:py-5 sm:text-xl"
            style={{
              background: 'linear-gradient(135deg, var(--merchant-primary), var(--merchant-shadow))',
              boxShadow: '0 14px 44px -10px color-mix(in srgb, var(--merchant-primary) 75%, transparent)',
            }}
          >
            {t('public.splash.enter')}
            <Icon
              name="arrowLeft"
              className="h-5 w-5 rotate-180 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-0 rtl:group-hover:-translate-x-1"
            />
          </motion.button>
          <span className="inline-flex items-center gap-2 text-sm text-white/75">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white/50" />
            {t('public.splash.hint')}
          </span>
        </motion.div>

        {menuLoading && (
          <motion.div
            {...rise(1.02)}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur"
          >
            <span
              aria-label={t('public.loadingMenu')}
              role="status"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
            {t('public.loadingMenu')}
          </motion.div>
        )}
      </div>

      {/* How long until the store opens by itself: the video's own progress,
          or the timer for a picture. Starts once the intro has played. */}
      {introDone && (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/10">
          {playsVideo ? (
            <div
              className="h-full bg-[var(--merchant-primary)] transition-[width] duration-300 ease-linear"
              style={{ width: `${videoProgress * 100}%` }}
            />
          ) : (
            <motion.div
              className="h-full bg-[var(--merchant-primary)]"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: AUTO_ENTER_MS / 1000, ease: 'linear' }}
              onAnimationComplete={enter}
            />
          )}
        </div>
      )}

      {/* Platform credit — platform-owned, like PoweredBy; merchants can't edit it. */}
      <motion.div
        {...rise(1.1)}
        className="relative flex shrink-0 justify-center px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        {/* The platform's own gold, not the merchant's colour: it is the same
            credit on every storefront. A light runs around the frame
            (.splash-credit, index.css) so it reads as a mark, not a caption. */}
        <span className="splash-credit relative inline-flex rounded-full p-[1.5px] shadow-[0_10px_30px_-8px_rgb(214_168_79_/_0.55)]">
          <span className="relative inline-flex items-center gap-2.5 rounded-full bg-[#0d0b08]/90 py-1.5 pe-1.5 ps-4 text-xs text-white/75 backdrop-blur-md sm:text-sm">
            <span aria-hidden="true" className="splash-credit-star text-[#f7df9a]">✦</span>
            <span className="whitespace-nowrap">
              {t('public.splash.designedBy')}{' '}
              <bdi className="bg-[linear-gradient(90deg,#f7df9a,#d6a84f_55%,#f7df9a)] bg-clip-text font-extrabold text-transparent">
                {creditName}
              </bdi>
            </span>
            {creditHref && (
              <a
                href={creditHref}
                target="_blank"
                rel="noopener noreferrer"
                className="splash-credit-cta relative overflow-hidden whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#f7df9a,#d6a84f_55%,#a8782a)] px-3.5 py-1.5 font-extrabold text-[#2a1d0a] shadow-[0_4px_14px_-4px_rgb(214_168_79_/_0.8)] transition-transform hover:scale-105 active:scale-95"
              >
                {t('public.splash.contactCta')}
              </a>
            )}
          </span>
        </span>
      </motion.div>
    </motion.div>
  )
}
