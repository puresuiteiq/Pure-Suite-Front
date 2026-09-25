import { apiClient } from './apiClient'

/**
 * The signed-in merchant's storefront welcome-screen background.
 *   PUT    /api/merchant/splash/media  (raw file) → { splashEnabled, splashTagline, splashMedia }
 *   DELETE /api/merchant/splash/media             → same shape, splashMedia null
 *
 * The on/off switch and tagline are ordinary profile fields and save with the
 * profile; only the media has endpoints of its own.
 */
export const splashService = {
  uploadMedia(file) {
    return apiClient.put('/merchant/splash/media', file)
  },

  removeMedia() {
    return apiClient.delete('/merchant/splash/media')
  },
}
