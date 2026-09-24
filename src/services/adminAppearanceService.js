import { apiClient } from './apiClient'

/**
 * The Super Admin's own dashboard colours (admin-gated).
 *   GET   /api/admin/appearance  → { accentColor, accentShadow }
 *   PATCH /api/admin/appearance  → { accentColor, accentShadow }
 */
export const adminAppearanceService = {
  get() {
    return apiClient.get('/admin/appearance', { auth: 'admin' })
  },
  update(colors) {
    return apiClient.patch('/admin/appearance', colors, { auth: 'admin' })
  },
}
