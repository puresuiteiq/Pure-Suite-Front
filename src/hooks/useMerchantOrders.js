import { useCallback, useEffect, useRef, useState } from 'react'
import { merchantOrdersService } from '../services/merchantOrdersService'

const DEFAULT_PAGE_SIZE = 10

/**
 * Loads the authenticated merchant's order history (merchant from the JWT).
 * Exposes `setData` so a status change can be applied without a refetch,
 * the same contract useMerchants uses.
 */
export function useMerchantOrders({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    merchantOrdersService
      .listOrders({ limit: pageSize, offset: 0 })
      .then((result) => {
        if (!active) return
        if (Array.isArray(result)) {
          setData(result)
          setTotal(result.length)
          setHasMore(false)
          return
        }
        setData(result.items ?? [])
        setTotal(result.total ?? 0)
        setHasMore(Boolean(result.hasMore))
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [pageSize])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const result = await merchantOrdersService.listOrders({ limit: pageSize, offset: data.length })
      setData((prev) => [...prev, ...(result.items ?? [])])
      setTotal(result.total ?? 0)
      setHasMore(Boolean(result.hasMore))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [data.length, hasMore, pageSize])

  return { data, setData, loading, loadingMore, error, total, setTotal, hasMore, loadMore }
}
