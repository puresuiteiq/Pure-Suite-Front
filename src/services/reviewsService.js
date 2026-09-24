import { apiClient } from './apiClient'

/**
 * Customer reviews for the authenticated merchant. The merchant is derived from
 * the JWT server-side, so no merchantId is passed.
 *   GET /api/merchant/reviews   → listReviews()
 */
export const reviewsService = {
  listReviews() {
    return apiClient.get('/merchant/reviews')
  },
}
