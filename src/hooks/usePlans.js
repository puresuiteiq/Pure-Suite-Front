import { useEffect, useState } from 'react'
import { plansService } from '../services/plansService'

/**
 * Loads subscription plans and exposes { data, setData, loading, error }.
 * `setData` lets the plans page apply optimistic updates after add/edit/remove
 * (same pattern as useServices).
 */
export function usePlans() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    plansService
      .list()
      .then((plans) => active && setData(plans))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, setData, loading, error }
}
