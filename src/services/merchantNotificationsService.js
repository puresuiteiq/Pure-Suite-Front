import { apiClient } from './apiClient'
import i18n from '../i18n/config'

/**
 * The authenticated merchant's own notifications feed (their orders, reviews and
 * subscription expiry). Same method shape as the admin `notificationsService`,
 * so <NotificationsMenu> can take either via its `service` prop.
 *   GET /api/merchant/notifications
 */
export const merchantNotificationsService = {
  listNotifications() {
    // Pass the UI language so server-built amounts use IQD / د.ع to match.
    return apiClient.get(`/merchant/notifications?lang=${encodeURIComponent(i18n.language || 'en')}`)
  },
  markRead(id) {
    return apiClient.post(`/merchant/notifications/${id}/read`, {})
  },
  remove(id) {
    return apiClient.delete(`/merchant/notifications/${id}`)
  },
}
