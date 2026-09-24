import { apiClient } from './apiClient'
import {
  clearAdminSession,
  clearMerchantSession,
  setAdminSession,
  setMerchantSession,
} from './session'

/**
 * The single sign-in for both roles. The backend matches the credentials
 * against admins then merchants, sets that role's httpOnly cookie, and names
 * the role in the response so the UI knows which panel to open:
 *   POST /api/auth/login → { role: 'admin', admin } | { role: 'merchant', merchant }
 *
 * A sign-in grants exactly one role, so the other role's display session is
 * dropped here — mirroring the backend, which clears the other cookie.
 * `auth: 'none'` keeps a rejected login from clearing a session on its own 401.
 */
export async function login({ email, password }) {
  const data = await apiClient.post(
    '/auth/login',
    { email, password },
    { auth: 'none' },
  )

  if (data.role === 'admin') {
    const session = {
      adminId: data.admin.id,
      email: data.admin.email,
      name: data.admin.name,
    }
    clearMerchantSession()
    setAdminSession(session)
    return { role: 'admin', session }
  }

  const session = {
    merchantId: data.merchant.id,
    email: data.merchant.email,
    businessName: data.merchant.businessName,
  }
  clearAdminSession()
  setMerchantSession(session)
  return { role: 'merchant', session }
}
