import { useEffect, useState } from 'react'
import { servicesService } from '../services/servicesService'

/**
 * Loads the Super Admin service-status board and exposes
 * { data, setData, loading, error }. `setData` lets the page apply optimistic
 * updates after add/edit/remove (same pattern as useMerchants).
 */
export function useServices() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    servicesService
      .list()
      .then((services) => active && setData(services))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, setData, loading, error }
}
