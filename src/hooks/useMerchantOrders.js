import { useEffect, useState } from 'react'
import { merchantOrdersService } from '../services/merchantOrdersService'

/**
 * Loads the authenticated merchant's order history (merchant from the JWT).
 * Exposes `setData` so a status change can be applied without a refetch,
 * the same contract useMerchants uses.
 */
export function useMerchantOrders() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    merchantOrdersService
      .listOrders()
      .then((orders) => active && setData(orders))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return { data, setData, loading, error }
}
