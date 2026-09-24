/**
 * Where the public storefront lives — the domain printed on QR codes and given
 * to customers.
 *
 * Deliberately not `window.location.origin` by default: a deployment answers on
 * every hostname pointed at it (the platform-generated one, a preview
 * environment, a `www.` alias), so a link built from whichever one the merchant
 * happened to open gets printed onto a code that is scanned for months. The
 * authoritative value is the backend's APP_URL, served by GET /api/public/config
 * and read through usePublicSiteUrl(); the values here are what the app uses
 * before that answers, or if it doesn't.
 *
 * Resolution order: APP_URL → VITE_PUBLIC_SITE_URL → the browser's own origin.
 */

/** Trim trailing slashes and assume https:// when the scheme was left off. */
export function normalizeOrigin(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withScheme.replace(/\/+$/, '')
}

/** Build-time override, for a frontend deployed apart from its API. */
export const BUILD_SITE_URL = normalizeOrigin(import.meta.env.VITE_PUBLIC_SITE_URL)

/** The host currently serving the app — the last resort, and right in dev. */
export function browserOrigin() {
  return typeof window === 'undefined' ? '' : window.location.origin
}

/**
 * Absolute storefront link for a merchant. `idOrSlug` is the readable slug
 * (/r/mamo) where the merchant has one, and the numeric id otherwise — the
 * backend resolves both, so codes printed before slugs existed still work.
 */
export function storefrontUrl(idOrSlug, baseUrl) {
  const base = normalizeOrigin(baseUrl) || BUILD_SITE_URL || browserOrigin()
  if (!idOrSlug || !base) return ''
  try {
    return new URL(`/r/${encodeURIComponent(idOrSlug)}`, base).toString()
  } catch {
    return ''
  }
}
