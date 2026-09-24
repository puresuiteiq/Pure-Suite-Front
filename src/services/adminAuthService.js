import { apiClient } from './apiClient'
import { clearAdminSession, getAdminSession } from './session'

/**
 * Super Admin session. Signing in is role-agnostic and lives in
 * `loginService` — the admin JWT is set there and cleared here, always as an
 * httpOnly cookie; this module only touches non-sensitive display info.
 *   POST /api/admin/logout           (clears the cookie)
 *   POST /api/admin/change-password  (self-service, requires the current one)
 */
export const adminAuthService = {
  getSession: getAdminSession,

  /**
   * Change the signed-in admin's own password. Hits the admin-gated profile
   * router, not the unauthenticated login router — see the backend handler.
   */
  async changePassword({ currentPassword, newPassword }) {
    return apiClient.post(
      '/admin/change-password',
      { currentPassword, newPassword },
      { auth: 'admin' },
    )
  },

  async logout() {
    try {
      await apiClient.post('/admin/logout', {}, { auth: 'admin' })
    } catch {
      // even if the network call fails, drop local state below
    }
    clearAdminSession()
  },
}
