import i18n from 'i18next'
import { clearSessionFor } from './session'
import { LANGUAGE_CODES } from '../i18n/languages'

/**
 * Central HTTP client.
 * - Auth rides on httpOnly cookies, so every request uses `credentials:'include'`.
 * - CSRF: for state-changing methods we send the `X-CSRF-Token` header whose
 *   value comes from the readable `csrf_token` cookie (double-submit pattern).
 *   The token is fetched from GET /api/csrf-token the first time it's needed.
 * - The `auth` option ('merchant' | 'admin' | 'none') only decides which
 *   display session to clear on a 401.
 *
 * Failures throw a plain Error carrying the server's message, plus:
 *   err.status   the HTTP status, or 0 when the request never reached the server
 *   err.code     a stable machine-readable code when the server sent one
 *   err.payload  the parsed error body
 *
 * The status used to be discarded, so no caller could tell a 409 "this plan is
 * still in use" from a 413 "that image is too large" from a generic failure —
 * every one of them arrived as an untyped message string. It stays a plain
 * Error (nothing uses instanceof) so existing `err.message` call sites are
 * unaffected.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * The active UI language, as an exact code the backend recognises.
 *
 * The backend's detectLanguage middleware whitelists 'en' | 'ar' | 'ku-badini'
 * and resolves anything else to undefined, which makes menu content fall back
 * to whatever the merchant originally typed. i18n.language can legitimately be
 * 'en-US' before detection settles, and that is NOT on the whitelist — so
 * without this guard the header would be sent and silently ignored, and every
 * storefront would appear untranslated for reasons nothing reports.
 *
 * Accept-Language is CORS-safelisted, so sending it needs no server change.
 */
function activeLanguage() {
  const current = i18n?.language
  return LANGUAGE_CODES.includes(current) ? current : 'en'
}

function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/** Return the current CSRF token, asking the backend to set one if absent. */
async function ensureCsrfToken() {
  const existing = readCsrfCookie()
  if (existing) return existing
  try {
    const res = await fetch(`${BASE_URL}/csrf-token`, { credentials: 'include', cache: 'no-store' })
    const data = await res.json()
    return data?.csrfToken || readCsrfCookie()
  } catch {
    return readCsrfCookie()
  }
}

async function request(path, { method = 'GET', body, headers, auth = 'merchant' } = {}) {
  // A File/Blob goes up as itself (the welcome-screen video is too big for
  // base64 JSON); everything else is JSON.
  const isFile = typeof Blob !== 'undefined' && body instanceof Blob
  const finalHeaders = {
    'Content-Type': isFile ? body.type || 'application/octet-stream' : 'application/json',
    // One line here covers every endpoint, because detectLanguage is mounted
    // app-wide. Per-service injection would be a dozen edits that drift.
    'Accept-Language': activeLanguage(),
    ...headers,
  }

  if (!SAFE_METHODS.has(method)) {
    const csrf = await ensureCsrfToken()
    if (csrf) finalHeaders['X-CSRF-Token'] = csrf
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include', // send/receive the httpOnly auth cookies
      cache: 'no-store',
      headers: finalHeaders,
      body: isFile ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // A network-level failure (fetch throws TypeError "Failed to fetch") almost
    // always means the backend API isn't reachable — surface that plainly.
    // status 0 marks "never reached the server", which is a different problem
    // from anything the server itself refused.
    const offline = new Error(
      "Can't reach the server. Make sure the backend API is running (npm run dev in /backend).",
    )
    offline.status = 0
    offline.code = 'NETWORK_UNREACHABLE'
    throw offline
  }

  if (!res.ok) {
    // Cookie missing/expired/invalid: drop the stale display session so the app
    // can route back to the right login on the next navigation.
    if (res.status === 401) clearSessionFor(auth)

    let detail = ''
    let payload
    try {
      payload = await res.json()
      detail = payload?.error || payload?.message || ''
    } catch {
      // response had no JSON body
    }
    const error = new Error(detail || `Request failed: ${res.status} ${res.statusText}`)
    error.status = res.status
    error.code = payload?.code ?? null
    error.payload = payload
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

/**
 * Resolve a server-returned image path against wherever the API actually lives.
 *
 * Image endpoints hand back paths like `/api/public/merchants/7/logo?v=…`,
 * which resolve correctly when the frontend and API share an origin — the
 * normal single-service deploy. When VITE_API_BASE_URL points somewhere else
 * (a frontend served separately from its API), a bare `/api/...` would resolve
 * against the frontend's own origin and 404, so the prefix is swapped here.
 *
 * Anything that is not an API path — a data URL, an absolute CDN URL — is
 * returned untouched.
 */
export function resolveMediaUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/api/')) return url
  if (BASE_URL === '/api') return url
  return BASE_URL.replace(/\/+$/, '') + url.slice('/api'.length)
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) =>
    request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
