import { useContext } from 'react'
import { MerchantProfileContext } from '../context/MerchantProfileContext'

export function useMerchantProfile() {
  const ctx = useContext(MerchantProfileContext)
  if (!ctx) {
    throw new Error(
      'useMerchantProfile must be used within a <MerchantProfileProvider>',
    )
  }
  return ctx
}
