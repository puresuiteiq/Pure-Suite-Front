import { useEffect, useState } from 'react'
import { merchantOverviewService } from '../services/merchantOverviewService'

/** Loads the authenticated merchant's real dashboard stats. */
export function useMerchantOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    merchantOverviewService
      .getOverview()
      .then((d) => active && setData(d))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, loading }
}
