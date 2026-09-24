import { useEffect, useState } from 'react'
import { reviewsService } from '../services/reviewsService'

/**
 * Loads the authenticated merchant's customer reviews (merchant from the JWT).
 * Read-only → returns { data, loading, error }.
 */
export function useReviews() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    reviewsService
      .listReviews()
      .then((reviews) => active && setData(reviews))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
