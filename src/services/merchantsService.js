import { apiClient, resolveMediaUrl } from './apiClient'

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

function withMediaUrls(result) {
  if (!result?.categories) return result
  return {
    ...result,
    merchant: result.merchant
      ? { ...result.merchant, logo: resolveMediaUrl(result.merchant.logo) }
      : result.merchant,
    categories: result.categories.map((category) => ({
      ...category,
      items: (category.items ?? []).map((item) => ({
        ...item,
        image: resolveMediaUrl(item.image),
      })),
    })),
  }
}

export const merchantsService = {
  list(params) {
    const search = new URLSearchParams()
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.offset) search.set('offset', String(params.offset))
    if (params?.q) search.set('q', params.q)
    if (params?.subscriptionStatus) search.set('subscriptionStatus', params.subscriptionStatus)
    if (params?.sort) search.set('sort', params.sort)
    if (params?.includeSubscriptionSummary) search.set('includeSubscriptionSummary', '1')
    const query = search.toString()
    return apiClient.get(`/merchants${query ? `?${query}` : ''}`, ADMIN)
  },

  async get(id, params) {
    const search = new URLSearchParams()
    if (params?.menu === false) search.set('menu', '0')
    if (params?.menuLimit) search.set('menuLimit', String(params.menuLimit))
    if (params?.menuOffset) search.set('menuOffset', String(params.menuOffset))
    const query = search.toString()
    return withMediaUrls(await apiClient.get(`/merchants/${id}${query ? `?${query}` : ''}`, ADMIN))
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
  // calendar picker). Returns { subscriptionExpiresAt, status }.
  renew(id, date) {
    return apiClient.post(`/merchants/${id}/renew`, date ? { date } : {}, ADMIN)
  },

  // Ends the subscription (expiry set to yesterday, so it reads as Expired).
  // Returns { subscriptionExpiresAt, status }.
  cancelSubscription(id) {
    return apiClient.post(`/merchants/${id}/cancel-subscription`, {}, ADMIN)
  },

  remove(id) {
    return apiClient.delete(`/merchants/${id}`, ADMIN)
  },
}
