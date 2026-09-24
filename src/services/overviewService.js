import { apiClient } from './apiClient'

/**
 * Super Admin "System Overview" — now backed by the real API
 * (`backend/` Express + MySQL). One call returns everything the page needs:
 *   GET /api/overview → { stats, ordersTrend, services }
 *
 * All values are computed live from the database:
 *   - Active Merchants: count of merchants with status='active'
 *   - Orders Today / 30-day chart / Failed Payments: from the orders table
 *   - Platform MRR: derived from each active merchant's plan price
 *   - Service Status: from the service_status table
 */
export const overviewService = {
  getOverview() {
    return apiClient.get('/overview', { auth: 'admin' })
  },

  /**
   * The plan-by-plan derivation of the Platform MRR headline:
   *   GET /api/overview/revenue → { mrr, activeMerchants, plans[] }
   * Each `plans` row is { plan, price, merchants, subtotal, unpriced }, summed
   * from live merchant records against the backend's plan price config.
   */
  getRevenue() {
    return apiClient.get('/overview/revenue', { auth: 'admin' })
  },
}
