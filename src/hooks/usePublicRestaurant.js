import { useCallback, useEffect, useRef, useState } from 'react'
import { publicService } from '../services/publicService'
import { resolveMediaUrl } from '../services/apiClient'

/**
 * Point every image path at wherever the API lives.
 *
 * Done once here rather than at each <img>, so no render site has to know the
 * deployment shape. A no-op in the normal same-origin deploy.
 */
const MENU_PAGE_SIZE = 10

function mergeCategories(current, next) {
  const byId = new Map(current.map((category) => [category.id, { ...category, items: [...category.items] }]))
  for (const category of next) {
    if (!byId.has(category.id)) {
      byId.set(category.id, { ...category, items: [...category.items] })
      continue
    }
    const existing = byId.get(category.id)
    const seen = new Set(existing.items.map((item) => item.id))
    existing.items.push(...category.items.filter((item) => !seen.has(item.id)))
  }
  return [...byId.values()]
}

function withMediaUrls(data) {
  return {
    ...data,
    profile: data.profile
      ? {
          ...data.profile,
          logo: resolveMediaUrl(data.profile.logo),
          splashMedia: data.profile.splashMedia
            ? { ...data.profile.splashMedia, url: resolveMediaUrl(data.profile.splashMedia.url) }
            : null,
        }
      : data.profile,
    categories: (data.categories ?? []).map((category) => ({
      ...category,
      image: resolveMediaUrl(category.image),
      items: (category.items ?? []).map((item) => ({
        ...item,
        image: resolveMediaUrl(item.image),
        images: Array.isArray(item.images) ? item.images.map(resolveMediaUrl) : item.images,
      })),
    })),
    banners: (data.banners ?? []).map((banner) => ({
      ...banner,
      image: resolveMediaUrl(banner.image),
    })),
  }
}

/**
 * Loads everything the public storefront needs for a merchant (profile + full
 * menu) in one unauthenticated call. Reads the same DB the merchant admin
 * writes to, so admin edits are reflected here.
 */
export function usePublicRestaurant(merchantId) {
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState([])
  // Merchant-uploaded slides for the top carousel; empty means none uploaded.
  const [banners, setBanners] = useState([])
  const [reviews, setReviews] = useState([])
  const [platformBranding, setPlatformBranding] = useState(null)
  const [suspended, setSuspended] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [menuPage, setMenuPage] = useState(null)
  const [error, setError] = useState(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    if (!merchantId) return
    let active = true
    setLoading(true)
    // Drop the previous merchant's data before fetching the next one.
    // Without this, navigating from one storefront to another kept showing the
    // first shop's menu until the second request resolved — and useCart, which
    // prices and prunes the cart against this list, would briefly be comparing
    // the new shop's cart against the old shop's products.
    setProfile(null)
    setCategories([])
    setBanners([])
    setReviews([])
    setPlatformBranding(null)
    setSuspended(false)
    setMenuPage(null)
    setError(null)

    publicService
      .getRestaurant(merchantId, { menu: false })
      .then(async (raw) => {
        if (!active) return
        const data = withMediaUrls(raw)
        setSuspended(Boolean(data.suspended))
        setProfile(data.profile)
        setCategories(data.categories ?? [])
        setBanners(data.banners)
        setReviews(data.reviews ?? [])
        setPlatformBranding(data.platformBranding ?? null)
        setMenuPage(data.menuPage ?? null)
        setLoading(false)
        if (!data.menuPage?.hasMore || data.suspended) return

        setLoadingMore(true)
        loadingMoreRef.current = true
        try {
          const menuRaw = await publicService.getRestaurant(merchantId, {
            menuLimit: MENU_PAGE_SIZE,
            menuOffset: 0,
          })
          if (!active) return
          const menuData = withMediaUrls(menuRaw)
          setCategories((prev) => mergeCategories(prev, menuData.categories ?? []))
          setBanners(menuData.banners ?? [])
          setMenuPage(menuData.menuPage ?? null)
        } catch (err) {
          if (active) setError(err)
        } finally {
          loadingMoreRef.current = false
          if (active) setLoadingMore(false)
        }
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [merchantId])

  const loadMore = useCallback(async () => {
    if (!merchantId || !menuPage?.hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const raw = await publicService.getRestaurant(merchantId, {
        menuLimit: MENU_PAGE_SIZE,
        menuOffset: categories.reduce((count, category) => count + category.items.length, 0),
      })
      const data = withMediaUrls(raw)
      setCategories((prev) => mergeCategories(prev, data.categories ?? []))
      setBanners(data.banners ?? [])
      setMenuPage(data.menuPage ?? null)
    } catch (err) {
      setError(err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [categories, merchantId, menuPage?.hasMore])

  return {
    profile,
    categories,
    banners,
    reviews,
    setReviews,
    platformBranding,
    suspended,
    loading,
    loadingMore,
    hasMore: Boolean(menuPage?.hasMore),
    loadMore,
    error,
  }
}
