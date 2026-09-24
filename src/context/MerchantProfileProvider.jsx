import { useCallback, useEffect, useMemo, useState } from 'react'
import { merchantProfileService } from '../services/merchantProfileService'
import { useAuth } from '../hooks/useAuth'
import { MerchantProfileContext } from './MerchantProfileContext'

/**
 * Loads the logged-in merchant's profile once and shares it across the
 * merchant area. `save` persists to the store AND updates context state, so a
 * change on the profile page is instantly reflected in the sidebar/topbar
 * branding without a refetch.
 */
export default function MerchantProfileProvider({ children }) {
  const { session } = useAuth()
  // The merchant is derived from the JWT server-side; this id is only an effect
  // key so the profile refetches if a different merchant logs in.
  const merchantId = session?.merchantId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!merchantId) return
    let active = true
    setLoading(true)

    merchantProfileService
      .getProfile()
      .then((data) => active && setProfile(data))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [merchantId])

  const save = useCallback(async (updates) => {
    const updated = await merchantProfileService.updateProfile(updates)
    setProfile(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ profile, loading, error, save }),
    [profile, loading, error, save],
  )

  return (
    <MerchantProfileContext.Provider value={value}>
      {children}
    </MerchantProfileContext.Provider>
  )
}
