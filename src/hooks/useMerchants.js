import { useCallback, useEffect, useRef, useState } from 'react'
import { merchantsService } from '../services/merchantsService'

/**
 * Loads the merchant list and exposes { data, setData, loading, error }.
 * `setData` lets pages apply optimistic updates after mutations (create,
 * status change, delete) without a full refetch — appropriate while the data
 * layer is mocked. A thin example of the data-fetching pattern for other
 * resources.
 */
export function useMerchants({
  pageSize,
  query = '',
  subscriptionStatus = '',
  sort = '',
  includeSubscriptionSummary = false,
} = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [subscriptionSummary, setSubscriptionSummary] = useState(null)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setData([])
    setHasMore(false)
    setTotal(null)
    setSubscriptionSummary(null)
    offsetRef.current = 0

    merchantsService
      .list(
        pageSize
          ? {
              limit: pageSize,
              offset: 0,
              q: query,
              subscriptionStatus,
              sort,
              includeSubscriptionSummary,
            }
          : { q: query, subscriptionStatus, sort, includeSubscriptionSummary },
      )
      .then((result) => {
        if (!active) return
        if (Array.isArray(result)) {
          setData(result)
          setTotal(result.length)
          setHasMore(false)
          return
        }
        setData(result.items ?? [])
        setTotal(result.total ?? result.items?.length ?? 0)
        setHasMore(Boolean(result.hasMore))
        setSubscriptionSummary(result.subscriptionSummary ?? null)
        offsetRef.current = result.items?.length ?? 0
      })
      .catch((err) => {
        if (active) setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [includeSubscriptionSummary, pageSize, query, sort, subscriptionStatus])

  const loadMore = useCallback(async () => {
    if (!pageSize || !hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const result = await merchantsService.list({
        limit: pageSize,
        offset: offsetRef.current,
        q: query,
        subscriptionStatus,
        sort,
        includeSubscriptionSummary,
      })
      const nextItems = result.items ?? []
      setData((prev) => {
        const seen = new Set(prev.map((merchant) => merchant.id))
        return [...prev, ...nextItems.filter((merchant) => !seen.has(merchant.id))]
      })
      offsetRef.current += nextItems.length
      setTotal(result.total ?? null)
      setHasMore(Boolean(result.hasMore))
      if (result.subscriptionSummary) setSubscriptionSummary(result.subscriptionSummary)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, includeSubscriptionSummary, pageSize, query, sort, subscriptionStatus])

  return {
    data,
    setData,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
    subscriptionSummary,
  }
}
