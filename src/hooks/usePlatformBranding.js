import { useContext } from 'react'
import { PlatformBrandingContext } from '../context/PlatformBrandingContext'

export function usePlatformBranding() {
  const value = useContext(PlatformBrandingContext)
  if (!value) throw new Error('usePlatformBranding must be used within PlatformBrandingProvider')
  return value
}
