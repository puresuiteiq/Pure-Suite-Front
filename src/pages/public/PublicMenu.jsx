import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import ThemeToggle from '../../components/ui/ThemeToggle'
import PublicItemCard from '../../components/public/PublicItemCard'
import CategoryBar from '../../components/public/CategoryBar'
import PromoCarousel from '../../components/public/PromoCarousel'
import ProductDetailSheet from '../../components/public/ProductDetailSheet'
import CheckoutModal from '../../components/public/CheckoutModal'
import CartPanel from '../../components/public/CartPanel'
import CartSummary from '../../components/public/CartSummary'
import StorefrontNav from '../../components/public/StorefrontNav'
import PoweredBy from '../../components/public/PoweredBy'
import SplashScreen from '../../components/public/SplashScreen'
import { RoyalCategoryNav, RoyalHeader, RoyalMenu } from '../../components/public/themes/RoyalTheme'
import { ModernCategoryNav, ModernHeader, ModernMenu } from '../../components/public/themes/ModernTheme'
import { KitCategoryNav, KitHeader, KitMenu } from '../../components/public/themes/ThemeKit'
import {
  KIT_LAYOUTS,
  SCROLL_SPY_OFFSETS,
  THEME_FONT_URLS,
  normalizeStorefrontTheme,
} from '../../config/storefrontThemes'
import SocialLinks from '../../components/public/SocialLinks'
import { VerticalContext } from '../../context/VerticalContext'
import { modeForBusinessType } from '../../config/businessCategories'
import ReviewForm from '../../components/public/ReviewForm'
import ReviewCard from '../../components/reviews/ReviewCard'
import StarRating from '../../components/reviews/StarRating'
import { usePublicRestaurant } from '../../hooks/usePublicRestaurant'
import { useCart } from '../../hooks/useCart'
import { useTheme } from '../../hooks/useTheme'
import { themedPanelStyle } from '../../utils/themedPanel'
import { publicService } from '../../services/publicService'
import { buildWhatsAppUrl, formatOrderMessage, normalizeWhatsAppNumber } from '../../utils/order'
import { translateApiError } from '../../utils/apiError'

/**
 * The storefront designs besides classic, which is written out inline below.
 * Each supplies its own header, category navigation and menu; everything else
 * (search, carousel, cart, checkout, the product sheet) is shared. Designs in
 * KIT_LAYOUTS are assembled from the theme kit and told which parts to use
 * through the `layout` prop.
 */
const KIT = { Header: KitHeader, CategoryNav: KitCategoryNav, Menu: KitMenu }
const THEMES = {
  royal: { Header: RoyalHeader, CategoryNav: RoyalCategoryNav, Menu: RoyalMenu },
  modern: { Header: ModernHeader, CategoryNav: ModernCategoryNav, Menu: ModernMenu },
  ...Object.fromEntries(Object.keys(KIT_LAYOUTS).map((key) => [key, KIT])),
}

// Storefront accent when the merchant hasn't chosen their own colours — the
// green the storefront has always shipped, so un-customised menus are unchanged.
const STOREFRONT_ACCENT = '#16a34a'
const STOREFRONT_SHADOW = '#15803d'

// Mirrors .public-storefront's own CSS defaults in index.css (dark, and
// light-mode-uncustomised). Used as the fallback for the --storefront-
// background(-shadow) vars below instead of an empty string — an empty value
// works for elements *inside* .public-storefront (its own class rule fills
// the gap), but portalled overlays (ProductDetailSheet, StorefrontInfoDrawer)
// render to document.body, outside that subtree, so they only ever see
// whatever's set on <html>. An empty custom property there makes their
// color-mix()-based backgrounds invalid CSS — silently dropped, revealing
// the backdrop behind instead of a themed panel.
const STOREFRONT_BACKGROUND_DARK = '#0c0c0e'
const STOREFRONT_BACKGROUND_SHADOW_DARK = '#17171a'
const STOREFRONT_BACKGROUND_LIGHT = '#f8fafc'
const STOREFRONT_BACKGROUND_SHADOW_LIGHT = '#eef2f7'

// The welcome screen shows once per tab session per store, so a reload — or
// coming back from the WhatsApp hand-off — lands on the menu, not the intro
// again. sessionStorage can be unavailable (private mode, blocked storage);
// then it simply shows every time.
const splashSeenKey = (merchantId) => `splash-seen:${merchantId}`
function StorefrontLoading({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200/70 bg-white/80 px-8 py-7 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <span
          aria-label={message}
          role="status"
          className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--merchant-primary,#16a34a)] dark:border-white/15"
        />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-100">{message}</p>
      </div>
    </div>
  )
}

function splashSeen(merchantId) {
  try {
    return window.sessionStorage.getItem(splashSeenKey(merchantId)) === '1'
  } catch {
    return false
  }
}
function markSplashSeen(merchantId) {
  try {
    window.sessionStorage.setItem(splashSeenKey(merchantId), '1')
  } catch {
    // Storage blocked: nothing to remember it in.
  }
}

export default function PublicMenu() {
  const { merchantId } = useParams()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const reduceMotion = useReducedMotion()
  const { profile, categories, banners, reviews, setReviews, platformBranding, suspended, loading, menuLoading, error } =
    usePublicRestaurant(merchantId)
  const [cartOpen, setCartOpen] = useState(false) // mobile drawer
  const [selectedItem, setSelectedItem] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  // The saved order awaiting its WhatsApp hand-off: { merchantOrderNo, phone,
  // address, notes, cartItems, total }. Set once recordOrder succeeds; drives
  // the checkout modal's confirmation step.
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [infoPanel, setInfoPanel] = useState(null)
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  // The merchant's chosen design ('classic' until they pick one).
  const themeKey = normalizeStorefrontTheme(profile?.storefrontTheme)
  const Theme = THEMES[themeKey] ?? null
  const kitLayout = KIT_LAYOUTS[themeKey] ?? null
  // Keyed by store, so moving to another storefront shows that one's screen.
  const [splashDismissed, setSplashDismissed] = useState(() => ({ [merchantId]: splashSeen(merchantId) }))
  const splashDone = splashDismissed[merchantId] ?? splashSeen(merchantId)
  const enterFromSplash = () => {
    markSplashSeen(merchantId)
    setSplashDismissed((prev) => ({ ...prev, [merchantId]: true }))
  }

  const menuItems = useMemo(
    () => categories.flatMap((category) => category.items || []),
    [categories],
  )

  // The cart prices itself from the live menu, so it has to be built from it.
  const cart = useCart(merchantId, menuItems)

  const visibleCategories = useMemo(
    () =>
      categories.map((category) => {
        const pictured = category.items.find((item) => item.image)
        return {
          ...category,
          image: pictured?.image || category.image || null,
          // The tile shows that item's photo, so it takes that item's framing.
          imageFocus: pictured ? pictured.coverFocus ?? null : null,
        }
      }),
    [categories],
  )

  // Customer search: filter items by name, brand, or description. While a query
  // is active the storefront shows just the matches (carousel + category bar
  // hidden), so the customer sees results, not the full menu.
  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const displayCategories = useMemo(() => {
    if (!searching) return categories
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          [item.name, item.brand, item.description]
            .some((field) => (field || '').toLowerCase().includes(q)),
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [categories, searching, q])

  // Offer a few menu items the customer has not selected yet.
  const recommendations = useMemo(() => {
    const selected = new Set(cart.items.map((item) => item.productId))
    return menuItems.filter((item) => !selected.has(item.id)).slice(0, 6)
  }, [cart.items, menuItems])

  const avgRating = useMemo(
    () =>
      reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
    [reviews],
  )

  // Submit a review, then prepend it so the customer sees it immediately.
  const handleSubmitReview = async (data) => {
    const created = await publicService.submitReview(merchantId, data)
    setReviews((prev) => [created, ...prev])
  }

  const isOpen = Boolean(profile?.isOpen)
  const nextOpenHour = profile?.workingHours?.find((hour) => !hour.closed)
  const canSend = cart.items.length > 0 && Boolean(profile?.phone) && isOpen

  // Paint the storefront in the merchant's chosen brand colours. Set on <html>
  // (not a wrapper div) so portalled overlays — the cart drawer and checkout
  // modal, which render to document.body — inherit them too. Falls back to the
  // storefront green when the merchant hasn't picked a colour.
  //
  // The background is customisable per theme independently: a merchant can
  // set one pair of colours for light mode and a separate pair for dark mode.
  // Either falls back to the platform's own default for that theme when the
  // merchant hasn't set one, so an un-customised merchant (or one who's only
  // customised one theme) is unaffected in the other.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--merchant-primary', profile?.accentColor || STOREFRONT_ACCENT)
    root.style.setProperty(
      '--merchant-shadow',
      profile?.accentShadow || profile?.accentColor || STOREFRONT_SHADOW,
    )
    const background =
      theme === 'light'
        ? profile?.storefrontBackground || STOREFRONT_BACKGROUND_LIGHT
        : profile?.storefrontBackgroundDark || STOREFRONT_BACKGROUND_DARK
    const backgroundShadow =
      theme === 'light'
        ? profile?.storefrontBackgroundShadow || profile?.storefrontBackground || STOREFRONT_BACKGROUND_SHADOW_LIGHT
        : profile?.storefrontBackgroundShadowDark || profile?.storefrontBackgroundDark || STOREFRONT_BACKGROUND_SHADOW_DARK
    root.style.setProperty('--storefront-background', background)
    root.style.setProperty('--storefront-background-shadow', backgroundShadow)
    // Price text colour, independent of --merchant-primary. Falls back to it
    // (via .price-text's own var(--price-color, var(--merchant-primary)) in
    // index.css) when unset, rather than being forced to a concrete value
    // here — that keeps "not customised" actually meaning "inherits the
    // accent colour" instead of freezing whatever the accent was at load.
    if (profile?.priceColor) {
      root.style.setProperty('--price-color', profile.priceColor)
    } else {
      root.style.removeProperty('--price-color')
    }
    return () => {
      root.style.removeProperty('--merchant-primary')
      root.style.removeProperty('--merchant-shadow')
      root.style.removeProperty('--storefront-background')
      root.style.removeProperty('--storefront-background-shadow')
      root.style.removeProperty('--price-color')
    }
  }, [
    theme,
    profile?.accentColor,
    profile?.accentShadow,
    profile?.storefrontBackground,
    profile?.storefrontBackgroundShadow,
    profile?.storefrontBackgroundDark,
    profile?.storefrontBackgroundShadowDark,
    profile?.priceColor,
  ])

  // The tab title is the store, not the platform index.html names. (Link
  // previews don't come from this — crawlers never run it; the API writes
  // those into the HTML itself.)
  useEffect(() => {
    if (!profile?.businessName) return undefined
    const previous = document.title
    document.title = profile.businessName
    return () => {
      document.title = previous
    }
  }, [profile?.businessName])

  // A theme's display font, loaded only on a storefront wearing that theme.
  useEffect(() => {
    const href = THEME_FONT_URLS[themeKey]
    if (!href || document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [themeKey])

  // Keep the category bar honest while the page scrolls. The active pill used
  // to change only on click, so scrolling by hand left it highlighting a
  // category you'd long since passed. Sections render in this same order, so
  // the current one is the last whose top has slipped under the sticky bar.
  // Reading positions on rAF (rather than an observer per section) also means
  // the pill tracks the smooth-scroll from a click, so a jump reads as travel.
  useEffect(() => {
    const ids = visibleCategories.map((category) => category.id)
    if (!ids.length) return undefined

    // Where a section's heading must reach before it counts as current: just
    // under that theme's sticky bar (classic's scrolls away).
    const spyOffset =
      SCROLL_SPY_OFFSETS[themeKey] ?? (KIT_LAYOUTS[themeKey] ? SCROLL_SPY_OFFSETS.kit : SCROLL_SPY_OFFSETS.classic)
    let frame = 0
    const sync = () => {
      frame = 0
      let current = ids[0]
      for (const id of ids) {
        const element = document.getElementById(`category-${id}`)
        if (!element) continue
        if (element.getBoundingClientRect().top > spyOffset) break
        current = id
      }
      setActiveCategoryId(current)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(sync)
    }

    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [visibleCategories, themeKey])

  // Add straight to the cart, unless the product has sizes — then open the
  // sheet so the customer picks one rather than us guessing. Shared by the card
  // "+" button and the cart's recommendation chips.
  const quickAdd = (product) => {
    // Guard unavailable / sold-out items (the card hides its "+"; this covers
    // other callers like the cart recommendations).
    if (product.availability && product.availability !== 'available') return
    if (product.stock != null && Number(product.stock) <= 0) return
    // Anything with options (priced variants OR extra groups like Size) opens
    // the sheet so the customer picks; otherwise add straight to the cart.
    if (product.variants?.length || product.attributes?.length) {
      setSelectedItem(product)
    } else {
      cart.addItem(product)
    }
  }

  // Quick-add from inside the open cart drawer. An item with options needs the
  // detail sheet, but the cart drawer covers it — so close the drawer first,
  // then open the sheet. Option-less items add straight in (drawer stays open).
  const quickAddFromCart = (product) => {
    if (product.availability && product.availability !== 'available') return
    if (product.stock != null && Number(product.stock) <= 0) return
    if (product.variants?.length || product.attributes?.length) {
      setCartOpen(false)
      setSelectedItem(product)
    } else {
      cart.addItem(product)
    }
  }

  // Jump to a category's section. Shared by the category bar and banners that
  // link to a category.
  const scrollToCategory = (categoryId) => {
    setActiveCategoryId(categoryId)
    document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSend = () => {
    if (!canSend) return
    setCheckoutOpen(true)
  }

  const closeCheckout = () => {
    setCheckoutOpen(false)
    setPlacedOrder(null)
    setOrderError(null)
  }

  // Step 1: record the order first, so we obtain its per-restaurant number and
  // can show it + put it in the WhatsApp message. On success the cart is emptied
  // (the order is now real — it must not be submittable twice) and we advance to
  // the confirmation step. WhatsApp is NOT opened here: doing so after an await
  // loses the user gesture and gets popup-blocked.
  const submitCheckout = async ({ name, phone, address, notes, serviceMethod, deliveryZone, tableNumber }) => {
    if (!canSend) return
    setSubmittingOrder(true)
    setOrderError(null)
    const cartItems = cart.items
    const subtotal = cart.totalPrice
    try {
      const result = await publicService.recordOrder(merchantId, {
        items: cart.items.map((item) => ({ id: item.productId, quantity: item.quantity, size_name: item.variantValue, attributes: item.attributes })),
        customerName: name,
        customerPhone: phone,
        serviceMethod,
        deliveryZone,
        tableNumber,
      })
      // Fee + total are authoritative from the server.
      setPlacedOrder({
        merchantOrderNo: result.merchantOrderNo,
        name,
        phone,
        address,
        notes,
        cartItems,
        subtotal: result.itemsTotal ?? subtotal,
        currency: cart.totalCurrency,
        deliveryFee: result.deliveryFee ?? 0,
        total: result.total ?? subtotal,
        serviceMethod: result.serviceMethod ?? serviceMethod ?? null,
        deliveryZone: result.deliveryZone ?? deliveryZone ?? null,
        tableNumber: result.tableNumber ?? tableNumber ?? null,
      })
      cart.clear()
    } catch (err) {
      setOrderError(translateApiError(err, t, 'public.checkout.orderFailed'))
    } finally {
      setSubmittingOrder(false)
    }
  }

  // Step 2: the confirmation tap — a fresh gesture, so window.open is safe. The
  // number is known, so it goes in the message the restaurant receives.
  const handleSendWhatsApp = () => {
    if (!placedOrder) return
    const { name, phone, address, notes, cartItems, subtotal, total, merchantOrderNo, serviceMethod, deliveryZone, deliveryFee, tableNumber } = placedOrder
    const message = formatOrderMessage({
      customerName: name,
      phone,
      address,
      cartItems,
      subtotal,
      total,
      notes,
      orderNumber: String(merchantOrderNo ?? '').padStart(4, '0'),
      serviceMethod,
      deliveryZone,
      deliveryFee,
      tableNumber,
    })
    const url = buildWhatsAppUrl(profile.phone, message)
    window.open(url, '_blank', 'noopener,noreferrer')
    closeCheckout()
  }

  if (loading) {
    return <StorefrontLoading message={t('public.loadingMenu')} />
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <p className="text-base font-semibold text-slate-900">
            {t('public.notFound')}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('public.notFoundHint')}</p>
        </div>
      </div>
    )
  }

  // Suspended merchant: show a friendly notice instead of the menu/cart.
  if (suspended) {
    const name = profile.businessName
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-200">
            {profile.logo ? (
              <img loading="lazy" decoding="async" src={profile.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-slate-500">
                {(name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {name && (
            <h1 className="mt-4 text-xl font-semibold text-slate-900">{name}</h1>
          )}
          <p className="mt-2 text-base font-medium text-slate-700">
            {t('public.suspendedTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('public.suspendedHint')}</p>
        </div>
      </div>
    )
  }

  // Storefront wording adapts to the merchant's vertical. PublicMenu both
  // provides VerticalContext (for its children) and renders its own strings, so
  // it can't read that context itself — inject the type manually here, and let
  // children use useVerticalT.
  const vertical = modeForBusinessType(profile.businessType)
  const vt = (key, opts) => t(key, { context: vertical, ...opts })

  // The merchant's brand colours, applied as CSS variables directly on the
  // storefront root (below) so every in-tree button/price picks them up with no
  // ordering race against other providers. The <html>-level effect above covers
  // the portalled overlays (cart drawer, checkout) that render outside this tree.
  const accentVars = {
    '--merchant-primary': profile.accentColor || STOREFRONT_ACCENT,
    '--merchant-shadow': profile.accentShadow || profile.accentColor || STOREFRONT_SHADOW,
    // Merchant-chosen background, independently per theme — undefined (not a
    // concrete colour) when they haven't customised that particular theme, so
    // `.public-storefront`'s own class-based default for it still applies
    // (see the <html>-level effect above for the matching rule on portalled
    // overlays).
    '--storefront-background':
      (theme === 'light' ? profile.storefrontBackground : profile.storefrontBackgroundDark) || undefined,
    '--storefront-background-shadow':
      theme === 'light'
        ? profile.storefrontBackgroundShadow || profile.storefrontBackground || undefined
        : profile.storefrontBackgroundShadowDark || profile.storefrontBackgroundDark || undefined,
    // Price text colour — undefined (not a concrete colour) when unset, so
    // .price-text's own var(--price-color, var(--merchant-primary)) fallback
    // in index.css applies instead of freezing it to the accent here.
    '--price-color': profile.priceColor || undefined,
  }

  const businessName = profile.businessName || vt('public.businessFallback')
  const isMenuEmpty = categories.every((c) => c.items.length === 0)
  // The merchant can turn the rating system off; default on when unset.
  const reviewsEnabled = profile.reviewsEnabled !== false

  const unavailableMessage = !isOpen
    ? vt('public.restaurantClosed')
    : !profile?.phone
      ? vt('public.cart.noPhone')
      : null

  return (
    <VerticalContext.Provider value={vertical}>
    {/* translate="no" repeats index.html's opt-out on the storefront itself:
        Chrome's auto-translate rewrote this menu on customers' phones (prices,
        buttons, even product names). Portalled overlays carry their own copy,
        since they render outside this element. */}
    <div
      translate="no"
      data-storefront-theme={themeKey}
      className={`public-storefront sf-theme-${themeKey} ${kitLayout ? 'sf-kit' : ''} ${banners.length ? 'sf-has-banners' : ''} notranslate min-h-screen bg-slate-50`}
      style={accentVars}
    >
      {/* Header — three tiers instead of a loose column: identity (logo +
          name + open/closed status + rating) on top with utility icons
          alongside it, then contact info as small pill "chips" (a
          professional-restaurant-site pattern — Zomato/Talabat-style — not
          bare text with a bullet separator), then social icons, split by
          thin dividers. Open/closed and the star rating were previously only
          visible several taps deep (the hours/reviews drawers); surfacing
          them here is what a real restaurant site leads with. */}
      {Theme ? (
        <Theme.Header
          profile={profile}
          businessName={businessName}
          reviewsEnabled={reviewsEnabled}
          reviewCount={reviews.length}
          avgRating={avgRating}
          isOpen={isOpen}
          searchOpen={searchOpen}
          onToggleSearch={() =>
            setSearchOpen((open) => {
              if (open) setQuery('') // clear when closing
              return !open
            })
          }
          onAbout={() => setAboutOpen(true)}
          layout={kitLayout}
          // The store's own first photo, with the framing the merchant chose —
          // never a banner: banners are drawn wide (2:1, often with text), and
          // the hero is tall on a phone, so one was cropped past recognition.
          heroImage={visibleCategories.find((category) => category.image)?.image || null}
          heroFocus={visibleCategories.find((category) => category.image)?.imageFocus ?? null}
        />
      ) : (
        <header className="public-header border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* drop-shadow (not box-shadow) so the halo traces the logo's own
                  rounded silhouette rather than its bounding box. Tailwind v4's
                  scale-* sets the standalone `scale` property, not `transform`, so
                  that — not transform — is what has to be transitioned. */}
              <div className="accent-surface flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-none transition-[box-shadow,scale] duration-300 ease-out hover:shadow-[0_0_16px_1px_var(--logo-glow)] motion-safe:hover:scale-[1.03] sm:h-16 sm:w-16">
                {profile.logo ? (
                  <img loading="lazy" decoding="async"
                    src={profile.logo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {businessName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {/* Up to two lines rather than truncate: beside the logo and the
                    three header icons, a 320–360px phone left ~100px, which cut
                    "The Olive Branch" to "…live Branch". */}
                <h1 className="line-clamp-2 break-words text-lg font-bold leading-tight tracking-tight text-slate-900 min-[380px]:text-xl dark:text-white sm:text-2xl">
                  {businessName}
                </h1>
                {reviewsEnabled && reviews.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StarRating value={avgRating} size="sm" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {avgRating.toFixed(1)} · {t('public.reviewCount', { count: reviews.length })}
                    </span>
                  </div>
                )}
                {/* The header only ever has room for one truncated line — tapping
                    it opens the full text in its own "About us" modal instead of
                    just cutting it off with no way to read the rest. */}
                {profile.description && (
                  <button
                    type="button"
                    onClick={() => setAboutOpen(true)}
                    className="mt-1.5 flex max-w-full items-center gap-1 text-start text-sm text-slate-500 transition-colors hover:text-[var(--merchant-primary)] dark:text-slate-400"
                  >
                    <span className="line-clamp-1 min-w-0">{profile.description}</span>
                    <Icon name="chevronDown" className="h-3.5 w-3.5 shrink-0 -rotate-90 rtl:rotate-90" />
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setSearchOpen((open) => {
                      if (open) setQuery('') // clear when closing
                      return !open
                    })
                  }
                  aria-label={t('public.search')}
                  aria-expanded={searchOpen}
                  className={`inline-flex h-9 w-9 items-center justify-center p-1.5 transition-all hover:scale-110 active:scale-95 ${searchOpen ? 'accent-text' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
                >
                  <Icon name="search" className="h-5 w-5" />
                </button>
                <ThemeToggle tone="bare" />
                <LanguageSwitcher tone="bare" />
              </div>
            </div>

            {(profile.phone || profile.address || Object.values(profile.socialLinks || {}).some(Boolean)) && (
              // flex-nowrap (was flex-wrap): wrapping dropped the social icons
              // to their own second line once there were enough of them to
              // outgrow the row — the whole point of SocialLinks shrinking its
              // own icons as more get added (see its own comment) is to stay on
              // one line instead. The phone/address block is the one that gives
              // way first (min-w-0 + truncate below), since the icons are the
              // fixed, always-fully-visible half of the row.
              <div className="mt-4 flex flex-nowrap items-center justify-between gap-x-3 border-t border-slate-100 pt-3.5 dark:border-white/5">
                {/* Pill "chips" instead of bare text + a bullet dot — reads as
                    a considered contact bar, closer to a real restaurant site,
                    instead of two lines of plain text mashed together. */}
                <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
                  {/* Opens a WhatsApp chat (not the phone dialer) — customers
                      contacting the restaurant directly, same channel the
                      order itself gets sent through. */}
                  {profile.phone && (
                    <a
                      href={`https://wa.me/${normalizeWhatsAppNumber(profile.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--merchant-primary)] hover:text-[var(--merchant-primary)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      <Icon name="phone" className="h-3.5 w-3.5 shrink-0" />
                      {/* dir="ltr": a phone number is inherently
                          left-to-right digits — without this, the Arabic/
                          Kurdish RTL paragraph direction lets the browser's
                          bidi algorithm reorder the digit groups, so "4001 199
                          0750" could render visually scrambled. */}
                      <span className="truncate" dir="ltr">{profile.phone}</span>
                    </a>
                  )}
                  {profile.address && (
                    // Opens the pasted map link when present; otherwise uses
                    // the pin from the map picker.
                    profile.mapUrl || (profile.latitude != null && profile.longitude != null) ? (
                      <a
                        href={profile.mapUrl || `https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--merchant-primary)] hover:text-[var(--merchant-primary)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{profile.address}</span>
                      </a>
                    ) : (
                      <span className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{profile.address}</span>
                      </span>
                    )
                  )}
                </div>
                <SocialLinks links={profile.socialLinks} className="shrink-0" />
              </div>
            )}
          </div>
        </header>
      )}

      {/* Search bar — toggled from the header icon. */}
      {searchOpen && (
        <div className="public-search-panel border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="relative mx-auto max-w-6xl">
            <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('public.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      )}

      {/* Carousel + category bar hide while searching — results take over. */}
      {!searching && (
        <PromoCarousel
          categories={categories}
          businessName={businessName}
          logo={profile.logo}
          banners={banners}
          showBanner={profile.showBanner !== false}
          onSelect={setSelectedItem}
          onSelectCategory={scrollToCategory}
        />
      )}

      {!searching && visibleCategories.length > 0 &&
        (Theme ? (
          <Theme.CategoryNav
            categories={visibleCategories}
            activeId={activeCategoryId ?? visibleCategories[0].id}
            onSelect={scrollToCategory}
            layout={kitLayout}
          />
        ) : (
          <CategoryBar categories={visibleCategories} activeId={activeCategoryId ?? visibleCategories[0].id} onSelect={scrollToCategory} />
        ))}

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        {/* Menu + info */}
        <div>
          {/* Opening hours */}
          {infoPanel === 'legacy-hours' && profile.workingHours?.length > 0 && (
            <section className="public-hours mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Icon name="clock" className="h-5 w-5 text-slate-400" />
                {t('public.openingHours')}
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {profile.workingHours.map((h) => (
                  <div
                    key={h.day}
                    className="flex items-center justify-between text-sm"
                  >
                    <dt className="text-slate-600">{t(`days.${h.day}`)}</dt>
                    <dd
                      className={
                        h.closed
                          ? 'text-slate-400'
                          : 'font-medium text-slate-900'
                      }
                    >
                      {h.closed ? t('public.closed') : `${h.open} – ${h.close}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Menu */}
          {!isOpen && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {vt('public.restaurantClosedHint')}
            </div>
          )}
          {menuLoading ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-8 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <span
                aria-label={t('public.loadingMenu')}
                role="status"
                className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--merchant-primary)] dark:border-white/15"
              />
              <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-100">
                {t('public.loadingMenu')}
              </p>
            </div>
          ) : isMenuEmpty ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Icon name="book" className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                {vt('public.menuComingSoon')}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {vt('public.menuComingSoonHint')}
              </p>
            </div>
          ) : searching && displayCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Icon name="search" className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                {t('public.noResults', { query: query.trim() })}
              </p>
              <p className="mt-1 text-sm text-slate-500">{t('public.noResultsHint')}</p>
            </div>
          ) : Theme ? (
            <Theme.Menu categories={displayCategories} onOpen={setSelectedItem} onQuickAdd={quickAdd} layout={kitLayout} />
          ) : (
            <div className="space-y-8">
              {displayCategories.map((category) => (
                  <motion.section
                    key={category.id}
                    id={`category-${category.id}`}
                    className="scroll-mt-24"
                    // Sections settle in as they're reached, so jumping from the
                    // category bar arrives somewhere rather than just cutting.
                    // `once` — re-animating on every pass would turn scrolling
                    // back up into a flicker.
                    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                        {category.name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {category.items.map((item) => (
                        <PublicItemCard
                          key={item.id}
                          item={item}
                          onOpen={() => setSelectedItem(item)}
                          onQuickAdd={quickAdd}
                        />
                      ))}
                    </div>
                  </motion.section>
                ))}
            </div>
          )}

          {/* Interactive summary cards: hours directly precede customer reviews. */}
          {(profile.workingHours?.length > 0 || reviewsEnabled) && (
          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            {profile.workingHours?.length > 0 && (
              <button type="button" onClick={() => setInfoPanel('hours')} className="luxury-glass luxury-card group rounded-3xl border p-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--merchant-primary)]">
                <div className="flex items-start justify-between"><span className="accent-surface btn-glow btn-glow-custom flex h-11 w-11 items-center justify-center rounded-2xl text-white"><Icon name="clock" className="h-5 w-5" /></span><Icon name="chevronDown" className="mt-2 h-4 w-4 -rotate-90 text-slate-400 transition-transform group-hover:-translate-x-1 rtl:rotate-90 rtl:group-hover:translate-x-1" /></div>
                <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{vt('public.openingHours')}</h2>
                <p className="mt-1 text-sm text-slate-500">{nextOpenHour ? `${nextOpenHour.open} – ${nextOpenHour.close}` : vt('public.closed')}</p>
              </button>
            )}
            {reviewsEnabled && (
              <button type="button" onClick={() => setInfoPanel('reviews')} className="luxury-glass luxury-card group rounded-3xl border p-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--merchant-primary)]">
                <div className="flex items-start justify-between"><span className="accent-surface btn-glow btn-glow-custom flex h-11 w-11 items-center justify-center rounded-2xl text-white"><Icon name="star" className="h-5 w-5" /></span><Icon name="chevronDown" className="mt-2 h-4 w-4 -rotate-90 text-slate-400 transition-transform group-hover:-translate-x-1 rtl:rotate-90 rtl:group-hover:translate-x-1" /></div>
                <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{t('public.customerReviews')}</h2>
                <div className="mt-2 flex items-center gap-2">{reviews.length ? <><StarRating value={avgRating} size="sm" /><span className="text-sm text-slate-500">{avgRating.toFixed(1)} ({reviews.length})</span></> : <span className="text-sm text-slate-500">{t('public.leaveReview')}</span>}</div>
              </button>
            )}
          </section>
          )}
        </div>

        {/* Permanent platform attribution — see PoweredBy (not merchant-editable). */}
        <PoweredBy branding={platformBranding} />
      </main>

      {/* Welcome screen over the (already rendered) menu, so entering is instant. */}
      <SplashScreen
        open={profile.splashEnabled === true && !splashDone}
        profile={profile}
        branding={platformBranding}
        menuLoading={menuLoading}
        onEnter={enterFromSplash}
      />

      {/* Floating bottom nav — Menu (back to top) + Cart (opens the drawer). */}
      <StorefrontNav
        itemCount={cart.totalItems}
        onMenuClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onCartClick={() => setCartOpen(true)}
      />

      {/* Mobile cart drawer. Same theme-tinted panel as CheckoutModal — see
          themedPanelStyle and the comment on Modal's panelStyle prop for why
          this has to be a real inline style, not a className. */}
      <Modal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={t('public.cart.yourOrder')}
        panelStyle={themedPanelStyle(theme)}
        panelClassName="storefront-modal notranslate"
        footer={
          cart.items.length > 0 ? (
            <CartSummary
              subtotal={cart.totalPrice}
              currency={cart.totalCurrency}
              itemCount={cart.totalItems}
              onSend={handleSend}
              canSend={canSend}
              unavailableMessage={unavailableMessage}
            />
          ) : null
        }
      >
        <CartPanel
          items={cart.items}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          onRemove={cart.removeItem}
          onClear={cart.clear}
          recommendations={recommendations}
          onQuickAdd={quickAddFromCart}
        />
      </Modal>
      <ProductDetailSheet
        item={selectedItem}
        available={isOpen}
        merchantId={merchantId}
        onClose={() => setSelectedItem(null)}
        onAdd={(item, quantity, variant, attrs) => cart.addItem(item, quantity, variant, attrs)}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={closeCheckout}
        onSubmit={submitCheckout}
        submitting={submittingOrder}
        placedOrder={placedOrder}
        onSend={handleSendWhatsApp}
        submitError={orderError}
        serviceMethods={profile.serviceMethods}
        subtotal={cart.totalPrice}
        currency={cart.totalCurrency}
      />
      <StorefrontInfoDrawer panel={infoPanel} onClose={() => setInfoPanel(null)} profile={profile} reviews={reviews} avgRating={avgRating} onSubmitReview={handleSubmitReview} t={vt} />

      {/* "About us" — the header's own description line only has room for one
          truncated line; tapping it opens the full text here, centred like
          every other public-storefront modal (same themedPanelStyle purple
          panel as the cart/checkout). */}
      {profile.description && (
        <Modal
          open={aboutOpen}
          onClose={() => setAboutOpen(false)}
          title={vt('public.aboutUs')}
          size="sm"
          panelStyle={themedPanelStyle(theme)}
          panelClassName="storefront-modal notranslate"
        >
          {/* Logo + accent divider as a considered header instead of the
              title bar dropping straight into bare paragraph text, and the
              text itself sits in its own tinted card (matching the drawer/
              checkout's card language) rather than floating loose on the
              panel. Logo gets a gold gradient frame + halo — the same
              --luxury-gold/-gold-light gradient as .luxury-login-brand,
              this app's one other "gold badge" mark — instead of a plain
              ring, so it reads as a considered, premium mark. */}
          <div className="flex flex-col items-center gap-5">
            {profile.logo && (
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 scale-125 rounded-full opacity-45 blur-xl"
                  style={{ backgroundColor: 'var(--luxury-gold)' }}
                />
                <div className="rounded-2xl bg-[linear-gradient(135deg,var(--luxury-gold-light),var(--luxury-gold)_55%,#8a5b15)] p-[2.5px] shadow-[0_10px_28px_-10px_rgb(214_168_79_/_0.55)]">
                  <img loading="lazy" decoding="async"
                    src={profile.logo}
                    alt=""
                    className="h-20 w-20 rounded-[15px] bg-white object-cover"
                  />
                </div>
              </div>
            )}
            <span aria-hidden="true" className="accent-surface h-1 w-12 rounded-full shadow-[0_2px_10px_-2px_var(--merchant-shadow)]" />
            <div className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--merchant-primary)_18%,transparent)] bg-white/60 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {profile.description}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </VerticalContext.Provider>
  )
}

function StorefrontInfoDrawer({ panel, onClose, profile, reviews, avgRating, onSubmitReview, t }) {
  const { theme } = useTheme()
  // Portalled to <body> for the same reason as ProductDetailSheet: rendered in
  // place, this is a direct child of `.public-storefront`, whose stacking-
  // context CSS forces `position: relative` on its children and would silently
  // override this `fixed inset-0`, laying the drawer out inline in the page.
  //
  // The portal wraps <AnimatePresence> itself (always rendered) rather than
  // being called conditionally *inside* it — AnimatePresence clones its
  // children internally and expects plain React elements, not a React portal,
  // so `{panel && createPortal(...)}` mounts nothing at all. Portalling the
  // whole block sidesteps that: AnimatePresence's own children, inside the
  // portal, are ordinary motion elements again.
  return createPortal(
    <AnimatePresence>
      {panel && (
        <motion.div translate="no" className="notranslate fixed inset-0 z-[60] flex justify-end bg-slate-950/55 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          {/* Panel background: same themedPanelStyle() the Cart drawer and
              CheckoutModal use, so all three portalled panels read at the
              same purple intensity as the page itself, not a paler one-off
              wash. storefront-drawer scopes the .luxury-glass/.luxury-card
              re-skin below (index.css) — this panel portals outside
              .public-storefront, so that ancestor-scoped override can't
              reach it on its own. */}
          <motion.aside
            className="storefront-drawer h-full w-full max-w-xl overflow-y-auto border-s border-white/25 p-5 text-slate-900 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:text-white sm:p-7"
            style={themedPanelStyle(theme)}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} onClick={(event) => event.stopPropagation()}>
            {/* Header — a hairline divider (tinted by the merchant's own
                colour, not a flat grey rule) separates the title from the
                content below, and the title itself carries a small accent
                mark instead of sitting bare, for a more considered, premium
                first impression than a plain heading + close button. */}
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--merchant-primary)_18%,transparent)] pb-4">
              <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                <span aria-hidden="true" className="accent-surface h-6 w-1.5 shrink-0 rounded-full" />
                {panel === 'hours' ? t('public.openingHours') : t('public.customerReviews')}
              </h2>
              <button type="button" onClick={onClose} className="btn-glow btn-glow-neutral rounded-2xl border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:border-red-300 active:bg-red-100 active:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"><Icon name="close" /></button>
            </div>
            {panel === 'hours' ? (
              /* Open hours used a fixed amber, then accent-text (the
                 merchant's own colour) — called out as still not fitting,
                 since a card already carrying the merchant's colour (fill,
                 border, icon badge) doesn't also need it on the one line of
                 text inside it. Plain ink instead: black in light mode,
                 white in dark, same as every other card title/value on this
                 storefront. "Closed" stays a step lighter (neutral grey):
                 it's an inactive state, not something to draw the eye to. */
              <dl className="mt-7 space-y-2">{profile.workingHours.map((hour) => <div key={hour.day} className="luxury-glass luxury-card flex items-center justify-between rounded-2xl border px-4 py-3"><dt className="font-medium text-slate-800 dark:text-slate-200">{t(`days.${hour.day}`)}</dt><dd className={hour.closed ? 'text-slate-500' : 'font-semibold text-slate-900 dark:text-white'}>{hour.closed ? t('public.closed') : `${hour.open} – ${hour.close}`}</dd></div>)}</dl>
            ) : (
              <div className="mt-7 space-y-6">
                {/* Score summary. The drawer header already names this panel,
                    so repeating "Customer reviews" here said nothing; the
                    score's own scale (out of 5, and how many people) does.
                    luxury-card adds the same soft lift-on-hover depth used
                    for the working-hours rows, instead of a flat static tile. */}
                <div className="luxury-glass luxury-card rounded-3xl border p-6">
                  {reviews.length ? (
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-bold leading-none tabular-nums text-slate-900 dark:text-white">
                        {avgRating.toFixed(1)}
                      </span>
                      <div>
                        <StarRating value={avgRating} size="lg" />
                        <p className="mt-1.5 text-xs text-slate-500">
                          {t('public.reviewCount', { count: reviews.length })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* A bare "0.0" next to five dead stars reads as a bad
                       score. With no ratings yet there is nothing to average,
                       so invite the first one instead of scoring nothing. An
                       accent-ringed icon badge anchors the empty state instead
                       of just dimming the stars to 60% opacity. */
                    <div className="flex flex-col items-center px-2 py-4 text-center">
                      <span className="accent-surface btn-glow btn-glow-custom flex h-14 w-14 items-center justify-center rounded-full text-white">
                        <Icon name="star" className="h-7 w-7" />
                      </span>
                      <div className="mt-4 flex justify-center">
                        <StarRating value={0} size="lg" />
                      </div>
                      <p className="mt-3.5 text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                        {t('public.noReviewsYet')}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{t('public.beTheFirst')}</p>
                    </div>
                  )}
                </div>

                <div className="luxury-glass luxury-card rounded-3xl border p-6">
                  <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Icon name="pencil" className="accent-text h-4 w-4" />
                    {t('public.leaveReview')}
                  </p>
                  <ReviewForm onSubmit={onSubmitReview} />
                </div>

                {reviews.length > 0 && (
                  <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-white/10">
                    {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
                  </div>
                )}
              </div>
            )}

            {/* The merchant's own logo (not PoweredBy's platform mark) at the
                end of the drawer, on both panels. mt-auto (pinned flush to
                the drawer's bottom edge) read as too far down — stranded in
                empty space on a short panel; mt-16, then mt-20, still read
                as not quite far enough, and mt-28 slightly overshot it.
                Settled on mt-24.
                The logo itself: a solid flat ring read as plain, not
                "luxury" — replaced with a gradient frame (the same
                accent-surface primary→shadow gradient as every button on
                this storefront, as an inset padding-border instead of a
                fill) plus a stronger glow behind it. */}
            {profile.logo && (
              <div className="mt-24 flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 scale-[1.8] rounded-full bg-[color-mix(in_srgb,var(--merchant-primary)_36%,transparent)] blur-2xl"
                  />
                  <div className="accent-surface btn-glow btn-glow-custom rounded-[1.15rem] p-[3px] shadow-[0_12px_30px_-10px_rgb(15_23_42_/_0.4)]">
                    <img loading="lazy" decoding="async"
                      src={profile.logo}
                      alt=""
                      className="h-16 w-16 rounded-[0.85rem] bg-white object-cover"
                    />
                  </div>
                </div>
                <span className="text-sm font-bold tracking-tight text-slate-600 dark:text-slate-300">
                  {profile.businessName || t('public.businessFallback')}
                </span>
                <span aria-hidden="true" className="accent-surface h-1 w-8 rounded-full opacity-70" />
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
