import { useEffect, useState } from 'react'
import { overviewService } from '../services/overviewService'

/**
 * Loads the Platform MRR breakdown (per-plan merchant counts and subtotals).
 * Read-only → { data, loading, error }.
 */
export function useRevenue() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    overviewService
      .getRevenue()
      .then((payload) => active && setData(payload))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
