import { apiClient } from './apiClient'

/**
 * Menu management for the authenticated merchant. The merchant is derived from
 * the JWT server-side, so no merchantId is passed (and a merchant can only
 * touch their own categories/items). Endpoints under /api/merchant/menu.
 *
 * For the PUBLIC storefront read, see publicService.js instead.
 */
export const menuService = {
  listMenu() {
    return apiClient.get('/merchant/menu')
  },

  // Forwards the whole object rather than picking out `name`, so a new
  // per-category field (nameI18n today) needs no change here.
  createCategory(data) {
    return apiClient.post('/merchant/menu/categories', data)
  },

  updateCategory(categoryId, data) {
    return apiClient.patch(`/merchant/menu/categories/${categoryId}`, data)
  },

  deleteCategory(categoryId) {
    return apiClient.delete(`/merchant/menu/categories/${categoryId}`)
  },

  createItem(categoryId, data) {
    return apiClient.post('/merchant/menu/items', { categoryId, ...data })
  },

  updateItem(itemId, data) {
    return apiClient.patch(`/merchant/menu/items/${itemId}`, data)
  },

  deleteItem(itemId) {
    return apiClient.delete(`/merchant/menu/items/${itemId}`)
  },
}
