import { apiClient } from './apiClient'

/**
 * Real dashboard stats for the authenticated merchant.
 *   GET /api/merchant/overview → { ordersToday, revenueToday, reviewsCount, avgRating }
 */
export const merchantOverviewService = {
  getOverview() {
    return apiClient.get('/merchant/overview')
  },
}
