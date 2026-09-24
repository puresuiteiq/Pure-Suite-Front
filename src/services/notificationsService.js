import { apiClient } from './apiClient'
import i18n from '../i18n/config'

/**
 * Super Admin notifications (admin-gated). Read-only.
 *   GET /api/notifications → listNotifications()
 */
export const notificationsService = {
  listNotifications() {
    // Pass the UI language so server-built currency amounts use IQD / د.ع to match.
    return apiClient.get(`/notifications?lang=${encodeURIComponent(i18n.language || 'en')}`, {
      auth: 'admin',
    })
  },
  markRead(id) { return apiClient.post(`/notifications/${id}/read`, {}, { auth: 'admin' }) },
  remove(id) { return apiClient.delete(`/notifications/${id}`, { auth: 'admin' }) },
}
