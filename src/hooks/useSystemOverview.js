import { useEffect, useState } from 'react'
import { overviewService } from '../services/overviewService'

/**
 * Loads the Super Admin overview payload (stats, orders trend, service status).
 * Read-only → { data, loading, error }.
 */
export function useSystemOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    overviewService
      .getOverview()
      .then((payload) => active && setData(payload))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
