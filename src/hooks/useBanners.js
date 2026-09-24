import { useCallback, useEffect, useRef, useState } from 'react'
import { bannersService } from '../services/bannersService'
import { resolveMediaUrl } from '../services/apiClient'

// Until the server says otherwise; it sends its own limit with the list.
const DEFAULT_MAX = 15

const withMediaUrl = (banner) => ({ ...banner, image: resolveMediaUrl(banner.image) })

/**
 * Loads and mutates the merchant's storefront banners.
 *
 * Same contract as useMenu: each mutation awaits the server, then applies the
 * server's response to state. No rollback — a rejection leaves state untouched
 * and rethrows, so the caller can report it.
 *
 * Exposes { banners, linkTargets, available, max, loading, error,
 * addBanner, editBanner, removeBanner, moveBanner }.
 *   linkTargets  the merchant's menu (names only) to link a banner to
 *   available    false when the database has no banners table yet
 */
export function useBanners() {
  const [banners, setBanners] = useState([])
  const [linkTargets, setLinkTargets] = useState([])
  const [available, setAvailable] = useState(true)
  const [max, setMax] = useState(DEFAULT_MAX)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // True while a reorder is in flight — see moveBanner.
  const [moving, setMoving] = useState(false)
  const movingRef = useRef(false)

  useEffect(() => {
    let active = true
    bannersService
      .list()
      .then((data) => {
        if (!active) return
        setBanners((data.banners ?? []).map(withMediaUrl))
        setLinkTargets(data.linkTargets ?? [])
        setAvailable(data.available !== false)
        setMax(data.max ?? DEFAULT_MAX)
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const addBanner = useCallback(async (data) => {
    const created = withMediaUrl(await bannersService.create(data))
    setBanners((prev) => [...prev, created])
    return created
  }, [])

  const editBanner = useCallback(async (bannerId, data) => {
    const updated = withMediaUrl(await bannersService.update(bannerId, data))
    setBanners((prev) => prev.map((banner) => (banner.id === bannerId ? updated : banner)))
    return updated
  }, [])

  const removeBanner = useCallback(async (bannerId) => {
    await bannersService.remove(bannerId)
    setBanners((prev) => prev.filter((banner) => banner.id !== bannerId))
  }, [])

  // Swap a banner with its neighbour (offset -1 = earlier, +1 = later). The
  // server takes the whole order; the result is applied by id, so an edit to
  // another banner that lands while this is in flight isn't overwritten.
  //
  // One move at a time. Each move sends the complete order as it stood when
  // clicked, so a second move started before the first landed was computed
  // from the old order and undid the first — leaving the saved order and the
  // page disagreeing. A move started meanwhile is ignored, and `moving` lets
  // the page disable every move button until this one finishes.
  const moveBanner = useCallback(
    async (bannerId, offset) => {
      if (movingRef.current) return
      const from = banners.findIndex((banner) => banner.id === bannerId)
      const to = from + offset
      if (from < 0 || to < 0 || to >= banners.length) return
      const ids = banners.map((banner) => banner.id)
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      movingRef.current = true
      setMoving(true)
      try {
        await bannersService.reorder(ids)
        setBanners((prev) => ids.map((id) => prev.find((banner) => banner.id === id)).filter(Boolean))
      } finally {
        movingRef.current = false
        setMoving(false)
      }
    },
    [banners],
  )

  return {
    banners,
    linkTargets,
    available,
    max,
    loading,
    error,
    moving,
    addBanner,
    editBanner,
    removeBanner,
    moveBanner,
  }
}
