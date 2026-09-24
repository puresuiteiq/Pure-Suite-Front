/**
 * Persisted display info for the two independent roles. The JWT itself now
 * lives in an httpOnly cookie (not readable by JS) — this only holds
 * NON-sensitive identity for the UI (who is logged in, for immediate rendering
 * across refreshes). The cookie is the real credential; if it's missing/expired
 * the first API call 401s and the matching session here is cleared.
 *
 *   merchant session: { merchantId, email, businessName, impersonated? }
 *   admin session:    { adminId, email, name }
 *
 * `impersonated: true` marks a merchant session an admin adopted via "Manage
 * account" (both sessions are live then); MerchantLayout shows a banner + exit.
 */
const MERCHANT_KEY = 'merchant_session'
const ADMIN_KEY = 'admin_session'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null
  } catch {
    return null
  }
}

// --- Merchant ---
export const getMerchantSession = () => read(MERCHANT_KEY)
export const setMerchantSession = (s) =>
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(s))
export const clearMerchantSession = () => localStorage.removeItem(MERCHANT_KEY)

// --- Admin ---
export const getAdminSession = () => read(ADMIN_KEY)
export const setAdminSession = (s) =>
  localStorage.setItem(ADMIN_KEY, JSON.stringify(s))
export const clearAdminSession = () => localStorage.removeItem(ADMIN_KEY)

/** Clear the display session for a given audience (used on 401). */
export function clearSessionFor(audience) {
  if (audience === 'admin') clearAdminSession()
  else if (audience === 'merchant') clearMerchantSession()
}
