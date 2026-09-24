/**
 * Turn an apiClient error into text the current user can read.
 *
 * The backend writes its messages in English. In an app that ships Arabic and
 * Kurdish Badini, that meant a merchant working entirely in Arabic hit English
 * error text the moment anything went wrong. Errors the server tags with a
 * `code` are translated here; anything untagged falls back to the server's own
 * message, so this can be adopted a route at a time without regressing.
 *
 * Usage mirrors the existing inline-banner convention:
 *
 *   catch (err) { setError(translateApiError(err, t)) }
 */

/**
 * @param {Error & { code?: string|null, status?: number }} err
 * @param {(key: string, opts?: object) => string} t  i18next's t
 * @param {string} [fallbackKey]  used when the server sent no message at all
 */
export function translateApiError(err, t, fallbackKey = 'errors.generic') {
  const serverMessage = err?.message || ''

  if (err?.code) {
    // defaultValue means an unrecognised code degrades to the server's English
    // text rather than rendering the raw key — the failure mode i18next has by
    // default, and the one that put "merchantDetails.copyNote" on screen.
    return t(`errors.${err.code}`, {
      defaultValue: serverMessage || t(fallbackKey),
      // API errors carry params in the response body; client-side errors
      // (ImageError) carry them on the error itself.
      ...(err.payload?.params ?? err.params ?? {}),
    })
  }

  return serverMessage || t(fallbackKey)
}
