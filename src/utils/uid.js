/**
 * A unique id for local list keys (option rows, feature rows, …).
 *
 * `crypto.randomUUID()` only exists in a *secure context* — HTTPS or localhost.
 * Opening the app over plain http on a LAN address (e.g. http://192.168.1.5)
 * leaves it undefined, so calling it there threw and blanked the whole page.
 * This falls back to a random string when it isn't available.
 */
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
