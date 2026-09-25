import { useEffect, useMemo, useState } from 'react'
import { PlatformBrandingContext } from './PlatformBrandingContext'
import { publicService } from '../services/publicService'

const EMPTY_BRANDING = {
  logo: null,
  poweredByText: null,
  name: null,
  poweredByColor: null,
  nameColor: null,
  whatsapp: null,
  platformName: null,
}

export default function PlatformBrandingProvider({ children }) {
  const [branding, setBrandingState] = useState(EMPTY_BRANDING)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    publicService
      .getConfig()
      .then((config) => {
        if (active) setBrandingState({ ...EMPTY_BRANDING, ...config?.platformBranding })
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const setBranding = (next) => {
    setBrandingState({ ...EMPTY_BRANDING, ...next })
  }

  const value = useMemo(
    () => ({ branding, setBranding, loading }),
    [branding, loading],
  )

  return (
    <PlatformBrandingContext.Provider value={value}>
      {children}
    </PlatformBrandingContext.Provider>
  )
}
