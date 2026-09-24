import { apiClient } from './apiClient'

/**
 * Service-status board for the SUPER ADMIN (admin-role JWT). These are entries
 * the admin maintains by hand — not auto-measured — so the panel reflects real,
 * admin-entered values.
 *   GET    /api/services      → list()
 *   POST   /api/services      → create(data)
 *   PATCH  /api/services/:id  → update(id, data)
 *   DELETE /api/services/:id  → remove(id)
 */
const ADMIN = { auth: 'admin' }

export const servicesService = {
  list() {
    return apiClient.get('/services', ADMIN)
  },
  create(data) {
    return apiClient.post('/services', data, ADMIN)
  },
  update(id, data) {
    return apiClient.patch(`/services/${id}`, data, ADMIN)
  },
  remove(id) {
    return apiClient.delete(`/services/${id}`, ADMIN)
  },
}
