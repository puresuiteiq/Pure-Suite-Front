import { useEffect, useMemo, useRef, useState } from 'react'
import BannerArtwork from './BannerArtwork'

// How long a slide stays up. Merchant banners get longer: they are made to be
// read (an offer, opening times), where a product photo only needs a glance.
const PHOTO_INTERVAL_MS = 3000
const BANNER_INTERVAL_MS = 4500

// A horizontal movement shorter than this is a tap, not a swipe.
const SWIPE_THRESHOLD_PX = 40

/**
 * The storefront's top carousel.
 *
 * Shows the merchant's uploaded banners when there are any — in their order,
 * with a caption only where they wrote one, and a tap that opens the linked
 * product or jumps to the linked category. With none it shows what it always
 * has: the merchant's product photos, or the logo. `showBanner` false hides it.
 */
export default function PromoCarousel({
  categories,
  businessName,
  logo,
  banners = [],
  showBanner = true,
  onSelect,
  onSelectCategory,
}) {
  const custom = banners.length > 0

  const slides = useMemo(() => {
    if (custom) {
      return banners.map((banner) => ({
        key: `banner-${banner.id}`,
        src: banner.image,
        title: banner.title,
        banner,
      }))
    }
    const photos = categories
      .flatMap((category) => category.items)
      .filter((item) => item.image)
      .map((item) => ({ key: item.image, src: item.image, title: item.name, item }))
    return photos.length ? photos : logo ? [{ key: logo, src: logo, title: businessName, item: null }] : []
  }, [custom, banners, categories, businessName, logo])

  const count = slides.length
  // `previous` keeps the outgoing banner's blurred backdrop mounted while it
  // fades out; without it the edges flash empty mid-transition.
  const [position, setPosition] = useState({ active: 0, previous: null })
  // Autoplay pauses while a finger is on the carousel.
  const [touching, setTouching] = useState(false)
  const sectionRef = useRef(null)
  const touchStart = useRef(null)
  const swiped = useRef(false)

  const show = (pick) =>
    setPosition(({ active }) => ({ previous: active, active: (((pick(active) % count) + count) % count) }))

  useEffect(() => {
    setPosition({ active: 0, previous: null })
  }, [count])

  useEffect(() => {
    if (count < 2 || touching) return undefined
    const timer = window.setInterval(
      () => setPosition(({ active }) => ({ previous: active, active: (active + 1) % count })),
      custom ? BANNER_INTERVAL_MS : PHOTO_INTERVAL_MS,
    )
    return () => window.clearInterval(timer)
  }, [count, touching, custom])

  if (!showBanner || !count) return null
  // The reset effect above runs after render, so for one render a shrunken
  // list can leave `active` past the end.
  const active = Math.min(position.active, count - 1)
  const slide = slides[active]

  // What tapping the current slide does, or null when it does nothing.
  const action = (() => {
    if (!custom) {
      return slide.item && onSelect ? { label: slide.title, run: () => onSelect(slide.item) } : null
    }
    const { linkType, linkId, title } = slide.banner
    if (linkType === 'product' && onSelect) {
      const item = categories.flatMap((category) => category.items).find((entry) => entry.id === linkId)
      return item ? { label: title || item.name, run: () => onSelect(item) } : null
    }
    if (linkType === 'category' && onSelectCategory) {
      // An empty category has no section on the page to scroll to.
      const category = categories.find((entry) => entry.id === linkId && entry.items.length > 0)
      return category ? { label: title || category.name, run: () => onSelectCategory(linkId) } : null
    }
    return null
  })()

  const onTouchStart = (event) => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
    swiped.current = false
    setTouching(true)
  }

  const onTouchEnd = (event) => {
    const start = touchStart.current
    const touch = event.changedTouches[0]
    touchStart.current = null
    setTouching(false)
    if (!start || !touch || count < 2) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    // Mostly-vertical movement is the page scrolling, not a swipe.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return
    swiped.current = true
    // The next slide comes from where the reading direction runs to: swipe
    // left for it in English, right in Arabic and Kurdish.
    const rtl = sectionRef.current && getComputedStyle(sectionRef.current).direction === 'rtl'
    const forward = rtl ? dx > 0 : dx < 0
    show((current) => current + (forward ? 1 : -1))
  }

  const onTouchCancel = () => {
    touchStart.current = null
    setTouching(false)
  }

  const activate = () => {
    // A swipe that ends over the slide can still fire a click. It was a swipe.
    if (swiped.current) {
      swiped.current = false
      return
    }
    action?.run()
  }

  return (
    // No top margin: a gap here exposed the page's own background (the
    // merchant's chosen storefront colour) as a bare strip between the
    // header/category bar and the carousel. Sitting flush removes it.
    //
    // Merchant banners take a fixed shape (2:1 on phones, where nearly every
    // customer is, 3:1 wider) so the recommended 1600×800 upload fills a phone
    // exactly. Product photos keep the fixed height they always had.
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={`public-carousel relative mx-auto max-w-6xl touch-pan-y overflow-hidden rounded-3xl border border-slate-200 ${
        custom ? 'aspect-[2/1] sm:aspect-[3/1]' : 'h-64 sm:h-80'
      }`}
    >
      {slides.map((item, index) => {
        const current = index === active
        return custom ? (
          <div
            key={item.key}
            aria-hidden={!current}
            className={`absolute inset-0 transition-opacity duration-700 ${current ? 'opacity-100' : 'opacity-0'}`}
          >
            <BannerArtwork
              src={item.src}
              title={item.title}
              eager={index === 0}
              backdrop={current || index === position.previous}
            />
          </div>
        ) : (
          <img
            key={item.key}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            src={item.src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${current ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      })}
      {!custom && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="text-xl font-bold text-white sm:text-2xl">{slide.title}</p>
          </div>
        </>
      )}
      {/* The tap target sits above the slides but below the dots, which pick a
          slide. Slides that lead nowhere get no target at all. */}
      {action && (
        <button
          type="button"
          onClick={activate}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={action.label}
        />
      )}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2" aria-label="Promotion slides">
          {slides.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => show(() => index)}
              className={`h-2 rounded-full transition-all ${index === active ? 'w-6 bg-emerald-400' : 'w-2 bg-white/55 hover:bg-white'}`}
              aria-label={`Show slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
