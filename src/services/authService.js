import { apiClient } from './apiClient'
import { clearMerchantSession, getMerchantSession } from './session'

/**
 * Merchant session + password recovery. Signing in is role-agnostic and lives
 * in `loginService` — the merchant JWT is set there and cleared here, always as
 * an httpOnly cookie; this module only touches non-sensitive display info.
 *   POST /api/auth/logout   (clears the cookie)
 */
export const authService = {
  getSession: getMerchantSession,

  async logout() {
    try {
      await apiClient.post('/auth/logout', {})
    } catch {
      // even if the network call fails, drop local state below
    }
    clearMerchantSession()
  },

  // Request a reset link. Response is always generic (no account enumeration);
  // in dev it may include `devResetUrl` for testing without email.
  requestPasswordReset(email) {
    return apiClient.post('/auth/forgot-password', { email }, { auth: 'none' })
  },

  // Check a token before showing the reset form → { valid: boolean }.
  validateResetToken(token) {
    return apiClient.get(
      `/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
      { auth: 'none' },
    )
  },

  resetPassword({ token, password }) {
    return apiClient.post(
      '/auth/reset-password',
      { token, password },
      { auth: 'none' },
    )
  },
}
