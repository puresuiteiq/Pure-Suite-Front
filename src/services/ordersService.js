import { apiClient } from './apiClient'

/**
 * Orders data access for the SUPER ADMIN (admin-role JWT). Read-only — orders
 * are recorded from real storefront activity, not created here.
 *   GET /api/orders → list()  (most recent, newest first)
 */
export const ordersService = {
  list() {
    return apiClient.get('/orders', { auth: 'admin' })
  },
}
