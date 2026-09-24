import { apiClient } from './apiClient'

/**
 * Subscription plans, managed by the Super Admin (admin-gated).
 *   GET    /api/plans        → list()
 *   POST   /api/plans        → create(data)
 *   PATCH  /api/plans/:id     → update(id, data)
 *   DELETE /api/plans/:id     → remove(id)
 * A plan is { id, name, price, periodDays, description, features[], active }.
 */
const ADMIN = { auth: 'admin' }

export const plansService = {
  list() {
    return apiClient.get('/plans', ADMIN)
  },
  create(data) {
    return apiClient.post('/plans', data, ADMIN)
  },
  update(id, data) {
    return apiClient.patch(`/plans/${id}`, data, ADMIN)
  },
  remove(id) {
    return apiClient.delete(`/plans/${id}`, ADMIN)
  },
}
