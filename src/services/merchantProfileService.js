import { apiClient } from './apiClient'

/**
 * Merchant self-service profile — backed by the authenticated API.
 *   GET   /api/merchant/profile   → getProfile()
 *   PATCH /api/merchant/profile   → updateProfile(updates)
 *
 * The merchant is derived from the JWT server-side, so no merchantId is passed.
 *
 * Working hours live in a MySQL JSON column. When a merchant has none yet, we
 * fall back to a sensible 7-day template so the hours editor is always usable.
 */
const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function defaultWorkingHours() {
  return WEEKDAYS.map((day) => ({
    day,
    open: '09:00',
    close: '22:00',
    closed: day === 'Sunday',
  }))
}

function withDefaults(profile) {
  return {
    ...profile,
    workingHours: profile.workingHours?.length
      ? profile.workingHours
      : defaultWorkingHours(),
  }
}

export const merchantProfileService = {
  async getProfile() {
    return withDefaults(await apiClient.get('/merchant/profile'))
  },

  async updateProfile(updates) {
    return withDefaults(await apiClient.patch('/merchant/profile', updates))
  },

  async resolveMapLink(url) {
    return apiClient.post('/merchant/profile/map-link/resolve', { url })
  },

  /**
   * Change the signed-in merchant's own password. The merchant is derived from
   * the JWT server-side, so no id is passed.
   */
  async changePassword({ currentPassword, newPassword }) {
    return apiClient.post('/merchant/change-password', { currentPassword, newPassword })
  },
}
