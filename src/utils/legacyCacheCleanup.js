const CLEANUP_RELOAD_KEY = 'legacy-cache-cleanup-reloaded:v1'

async function clearCacheStorage() {
  if (!('caches' in window)) return
  const keys = await window.caches.keys()
  await Promise.all(keys.map((key) => window.caches.delete(key)))
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return { hadController: false, count: 0 }
  const hadController = Boolean(navigator.serviceWorker.controller)
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
  return { hadController, count: registrations.length }
}

/**
 * Some earlier deployments/domains may have registered a service worker. A
 * service worker survives normal deploys and can keep serving old HTML/JS until
 * the user clears browsing data, which looks like a broken first visit. The
 * current app does not use one, so remove any leftover worker and Cache Storage
 * entries. If the current page was controlled by a worker, reload once so the
 * browser leaves that controlled context immediately.
 */
export function cleanupLegacyBrowserCache() {
  if (typeof window === 'undefined') return

  window.addEventListener('load', () => {
    ;(async () => {
      try {
        const { hadController, count } = await unregisterServiceWorkers()
        await clearCacheStorage()
        if ((hadController || count > 0) && window.sessionStorage.getItem(CLEANUP_RELOAD_KEY) !== '1') {
          window.sessionStorage.setItem(CLEANUP_RELOAD_KEY, '1')
          window.location.reload()
        }
      } catch {
        // Browsers can deny Cache Storage / service worker access in hardened
        // modes. The app should still run normally; this is best-effort cleanup.
      }
    })()
  }, { once: true })
}
