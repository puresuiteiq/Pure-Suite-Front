import { apiClient } from './apiClient'

/**
 * The authenticated merchant's storefront banners, under /api/merchant/banners.
 * The merchant is derived from the JWT server-side, so no merchantId is passed.
 *
 * Whether the storefront shows a banner at all is a profile field
 * (`showBanner`), saved through useMerchantProfile().save like the rest of the
 * profile.
 */
export const bannersService = {
  /** → { available, max, banners, linkTargets } */
  list() {
    return apiClient.get('/merchant/banners')
  },

  create(data) {
    return apiClient.post('/merchant/banners', data)
  },

  // Send only what changed: omitting `image` keeps the stored one (and the
  // URL customers have cached).
  update(bannerId, data) {
    return apiClient.patch(`/merchant/banners/${bannerId}`, data)
  },

  /** The complete order, every banner id once. */
  reorder(ids) {
    return apiClient.patch('/merchant/banners/order', { ids })
  },

  remove(bannerId) {
    return apiClient.delete(`/merchant/banners/${bannerId}`)
  },
}
