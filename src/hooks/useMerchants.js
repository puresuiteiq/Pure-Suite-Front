import { useEffect, useState } from 'react'
import { merchantsService } from '../services/merchantsService'

/**
 * Loads the merchant list and exposes { data, setData, loading, error }.
 * `setData` lets pages apply optimistic updates after mutations (create,
 * status change, delete) without a full refetch — appropriate while the data
 * layer is mocked. A thin example of the data-fetching pattern for other
 * resources.
 */
export function useMerchants() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    merchantsService
      .list()
      .then((merchants) => {
        if (active) setData(merchants)
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
  }, [])

  return { data, setData, loading, error }
}
