import { apiClient } from './apiClient'

/**
 * Merchant (restaurant tenant) data access for the SUPER ADMIN. Backed by the
 * real API and gated by an admin-role JWT, so every call sends the admin token
 * (`auth: 'admin'`). Endpoints:
 *   GET    /api/merchants        → list()
 *   GET    /api/merchants/:id    → get(id)
 *   POST   /api/merchants        → create(data)
 *   PATCH  /api/merchants/:id    → setStatus(id, status)   (Activate/Deactivate)
 *   DELETE /api/merchants/:id    → remove(id)
 */
const ADMIN = { auth: 'admin' }

export const merchantsService = {
  list() {
    return apiClient.get('/merchants', ADMIN)
  },

  get(id) {
    return apiClient.get(`/merchants/${id}`, ADMIN)
  },

  create(data) {
    return apiClient.post('/merchants', data, ADMIN)
  },

  setStatus(id, status) {
    return apiClient.patch(`/merchants/${id}`, { status }, ADMIN)
  },

  update(id, data) {
    return apiClient.patch(`/merchants/${id}`, data, ADMIN)
  },

  resetPassword(id) {
    return apiClient.post(`/merchants/${id}/reset-password`, {}, ADMIN)
  },

  // Mint a merchant session for this merchant (keeps the admin session too), so
  // the admin can open and manage the account from the merchant panel.
  // Returns { merchantId, email, businessName }.
  impersonate(id) {
    return apiClient.post(`/merchants/${id}/impersonate`, {}, ADMIN)
  },

  // Set the subscription's new expiry date directly (from the renew
  // calendar picker). Returns { subscriptionExpiresAt }.
  renew(id, date) {
    return apiClient.post(`/merchants/${id}/renew`, date ? { date } : {}, ADMIN)
  },

  // Ends the subscription (expiry set to yesterday, so it reads as Expired).
  // Returns { subscriptionExpiresAt }.
  cancelSubscription(id) {
    return apiClient.post(`/merchants/${id}/cancel-subscription`, {}, ADMIN)
  },

  remove(id) {
    return apiClient.delete(`/merchants/${id}`, ADMIN)
  },
}
