import { useEffect, useState } from 'react'
import { ordersService } from '../services/ordersService'

/** Loads recent platform orders → { data, loading, error }. Read-only. */
export function useOrders() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    ordersService
      .list()
      .then((orders) => active && setData(orders))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
