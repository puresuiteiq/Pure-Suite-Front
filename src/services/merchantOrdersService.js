import { apiClient } from './apiClient'

/**
 * The authenticated merchant's own order history. The merchant is derived from
 * the JWT server-side, so no merchantId is passed.
 *   GET /api/merchant/orders   → listOrders()
 */
export const merchantOrdersService = {
  /** Move one of the merchant's own orders to a new status. */
  updateStatus(orderId, status) {
    return apiClient.patch(`/merchant/orders/${orderId}`, { status })
  },

  delete(orderId) {
    return apiClient.delete(`/merchant/orders/${orderId}`)
  },

  listOrders(params = {}) {
    const search = new URLSearchParams()
    if (params.limit) search.set('limit', String(params.limit))
    if (params.offset) search.set('offset', String(params.offset))
    const qs = search.toString()
    return apiClient.get(`/merchant/orders${qs ? `?${qs}` : ''}`)
  },
}
