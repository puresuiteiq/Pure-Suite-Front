import { useEffect, useState } from 'react'
import { adminReviewsService } from '../services/adminReviewsService'

/**
 * Loads all platform reviews for the Super Admin. Read-only →
 * { data, loading, error }.
 */
export function useAdminReviews() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    adminReviewsService
      .listAll()
      .then((reviews) => active && setData(reviews))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, setData, loading, error }
}
