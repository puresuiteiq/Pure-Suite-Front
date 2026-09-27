import { apiClient } from './apiClient'

/**
 * Sub-admins — the main admin only.
 *   GET    /api/admins                     → list()
 *   POST   /api/admins  { name, email }    → create()  (answer carries a one-time tempPassword)
 *   PATCH  /api/admins/:id/status          → setStatus()
 *   POST   /api/admins/:id/reset-password  → resetPassword()  → { tempPassword }
 *   DELETE /api/admins/:id                 → remove()
 */
const ADMIN = { auth: 'admin' }

export const subAdminsService = {
  list() {
    return apiClient.get('/admins', ADMIN)
  },
  create({ name, email }) {
    return apiClient.post('/admins', { name, email }, ADMIN)
  },
  resetPassword(id) {
    return apiClient.post(`/admins/${encodeURIComponent(id)}/reset-password`, {}, ADMIN)
  },
  setStatus(id, status) {
    return apiClient.patch(`/admins/${encodeURIComponent(id)}/status`, { status }, ADMIN)
  },
  remove(id) {
    return apiClient.delete(`/admins/${encodeURIComponent(id)}`, ADMIN)
  },
}
