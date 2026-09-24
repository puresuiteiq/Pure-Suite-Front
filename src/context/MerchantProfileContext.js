import { createContext } from 'react'

/**
 * Profile context value: { profile, loading, error, save }.
 * Provided by <MerchantProfileProvider> (which wraps the merchant layout so
 * both the shell branding and the profile page share one source of truth) and
 * consumed via the useMerchantProfile hook.
 */
export const MerchantProfileContext = createContext(null)
