import { useEffect, useState } from 'react'
import { publicService } from '../services/publicService'
import { resolveMediaUrl } from '../services/apiClient'

/**
 * Point every image path at wherever the API lives.
 *
 * Done once here rather than at each <img>, so no render site has to know the
 * deployment shape. A no-op in the normal same-origin deploy.
 */
function withMediaUrls(data) {
  return {
    ...data,
    profile: data.profile ? { ...data.profile, logo: resolveMediaUrl(data.profile.logo) } : data.profile,
    categories: (data.categories ?? []).map((category) => ({
      ...category,
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
  const [error, setError] = useState(null)

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
    setError(null)

    publicService
      .getRestaurant(merchantId)
      .then((raw) => {
        if (!active) return
        const data = withMediaUrls(raw)
        setSuspended(Boolean(data.suspended))
        setProfile(data.profile)
        setCategories(data.categories ?? [])
        setBanners(data.banners)
        setReviews(data.reviews ?? [])
        setPlatformBranding(data.platformBranding ?? null)
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [merchantId])

  return { profile, categories, banners, reviews, setReviews, platformBranding, suspended, loading, error }
}
