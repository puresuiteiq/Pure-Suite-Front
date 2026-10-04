import { apiClient, resolveMediaUrl } from './apiClient'

/**
 * Menu management for the authenticated merchant. The merchant is derived from
 * the JWT server-side, so no merchantId is passed (and a merchant can only
 * touch their own categories/items). Endpoints under /api/merchant/menu.
 *
 * For the PUBLIC storefront read, see publicService.js instead.
 */
function withMediaUrls(data) {
  if (Array.isArray(data)) {
    return data.map((category) => ({
      ...category,
      items: (category.items ?? []).map((item) => ({ ...item, image: resolveMediaUrl(item.image) })),
    }))
  }
  if (!data?.categories) return data
  return {
    ...data,
    categories: data.categories.map((category) => ({
      ...category,
      items: (category.items ?? []).map((item) => ({ ...item, image: resolveMediaUrl(item.image) })),
    })),
  }
}

export const menuService = {
  async listMenu(params) {
    const search = new URLSearchParams()
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.offset) search.set('offset', String(params.offset))
    const query = search.toString()
    return withMediaUrls(await apiClient.get(`/merchant/menu${query ? `?${query}` : ''}`))
  },

  getItem(itemId) {
    return apiClient.get(`/merchant/menu/items/${itemId}`)
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

  /** Drag-and-drop order: every category id, in the order the merchant set. */
  reorderCategories(ids) {
    return apiClient.patch('/merchant/menu/categories/order', { ids })
  },

  /**
   * One category's items in a new order. May be only the loaded page of them;
   * the server keeps the rest where they were.
   */
  reorderItems(categoryId, ids) {
    return apiClient.patch(`/merchant/menu/categories/${categoryId}/items/order`, { ids })
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
