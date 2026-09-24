import { apiClient } from './apiClient'

/**
 * Platform-wide reviews for Super Admin oversight (admin-gated). Read-only.
 *   GET /api/admin/reviews → all reviews across every merchant (+ merchantName)
 */
export const adminReviewsService = {
  /** Remove a review. Super Admin only — merchants have no delete route. */
  remove(reviewId) {
    return apiClient.delete(`/admin/reviews/${reviewId}`, { auth: 'admin' })
  },

  listAll() {
    return apiClient.get('/admin/reviews', { auth: 'admin' })
  },
}
