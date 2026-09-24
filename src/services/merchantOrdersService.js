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

  listOrders() {
    return apiClient.get('/merchant/orders')
  },
}
