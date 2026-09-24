import { useEffect, useState } from 'react'
import { publicService } from '../services/publicService'
import { BUILD_SITE_URL, browserOrigin, normalizeOrigin } from '../config/site'

/**
 * The domain to put in front of a public link — the backend's APP_URL, so a QR
 * code carries the domain the business owns rather than whichever hostname
 * served the dashboard. See src/config/site.js for why that distinction matters.
 *
 * Fetched once per page load and shared by every caller. Until it answers (and
 * if it never does) the build-time override or the browser's own origin stands
 * in, so the card always shows a working link rather than an empty box.
 */
let cachedAppUrl = null // '' means: asked, and the API named no domain
let pending = null

function fallbackSiteUrl() {
  return BUILD_SITE_URL || browserOrigin()
}

export function usePublicSiteUrl() {
  const [siteUrl, setSiteUrl] = useState(() => cachedAppUrl || fallbackSiteUrl())

  useEffect(() => {
    if (cachedAppUrl !== null) return undefined
    let active = true

    pending ??= publicService
      .getConfig()
      .then((config) => normalizeOrigin(config?.appUrl))
      .catch(() => '') // an unreachable API is not worth surfacing for this

    pending.then((url) => {
      cachedAppUrl = url
      if (active && url) setSiteUrl(url)
    })

    return () => {
      active = false
    }
  }, [])

  return siteUrl
}
