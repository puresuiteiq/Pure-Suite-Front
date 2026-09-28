import { apiClient } from './apiClient'

/**
 * Public storefront — no authentication (CSRF still applies to writes).
 *   GET  /api/public/config                   → { appUrl }
 *   GET  /api/public/merchants/:id           → { profile, categories, reviews }
 *   GET  /api/public/merchants/:id/products/:pid/images → { images }
 *   POST /api/public/merchants/:id/reviews    → submit a customer review
 */
export const publicService = {
  // Deployment values the browser can't know on its own — today just
  // { appUrl }, the domain to build storefront links and QR codes from.
  getConfig() {
    return apiClient.get('/public/config', { auth: 'none' })
  },

  getRestaurant(merchantId) {
    return apiClient.get(`/public/merchants/${encodeURIComponent(merchantId)}`, {
      auth: 'none',
    })
  },

  getRestaurantShell(merchantId) {
    return apiClient.get(`/public/merchants/${encodeURIComponent(merchantId)}?menu=0`, {
      auth: 'none',
    })
  },

  /**
   * One product's full gallery, fetched only when a customer opens it.
   *
   * The menu listing carries each product's cover alone — galleries were the
   * bulk of the storefront payload and none of it is rendered until a product
   * is tapped.
   */
  getProductImages(merchantId, productId) {
    return apiClient.get(
      `/public/merchants/${encodeURIComponent(merchantId)}/products/${encodeURIComponent(productId)}/images`,
      { auth: 'none' },
    )
  },

  submitReview(merchantId, data) {
    return apiClient.post(
      `/public/merchants/${encodeURIComponent(merchantId)}/reviews`,
      data,
      { auth: 'none' },
    )
  },

  // Record the order so dashboards + the merchant's order history reflect real
  // activity. `details` carries the items, customer name/phone, and the chosen
  // service method (the server resolves the delivery fee — never trusting a
  // client-sent amount).
  recordOrder(merchantId, {
    items,
    customerName,
    customerPhone,
    serviceMethod,
    deliveryZone,
    tableNumber,
  }) {
    return apiClient.post(
      `/public/merchants/${encodeURIComponent(merchantId)}/orders`,
      { items, customerName, customerPhone, serviceMethod, deliveryZone, tableNumber },
      { auth: 'none' },
    )
  },
}
