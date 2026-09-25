import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Values for index.html's share-card placeholders (%VITE_PLATFORM_NAME% …),
  // filled by the plugin below before Vite's own env replacement runs. Done in
  // a plugin rather than through process.env because Vite leaves an unset
  // placeholder verbatim, and a dev server that hadn't reloaded its env showed
  // "%VITE_PLATFORM_NAME%" as the tab title. The real per-page card comes from
  // the API when it serves the page (backend pageController.js).
  const apiBase = env.VITE_API_BASE_URL || '/api'
  const shareCard = {
    VITE_PLATFORM_NAME: env.VITE_PLATFORM_NAME || 'Pure Suite',
    VITE_PLATFORM_DESCRIPTION:
      env.VITE_PLATFORM_DESCRIPTION ||
      'منصّة لإنشاء قوائم الطعام والمتاجر الإلكترونية، واستقبال الطلبات مباشرة عبر واتساب.',
    VITE_PUBLIC_SITE_URL: env.VITE_PUBLIC_SITE_URL || '',
    // A crawler needs an absolute URL; with a relative API base (dev) there is none.
    VITE_OG_IMAGE: /^https?:\/\//.test(apiBase) ? `${apiBase.replace(/\/+$/, '')}/public/brand-logo` : '',
  }
  const escapeAttr = (value) =>
    String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const shareCardPlugin = {
    name: 'share-card-placeholders',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(/%(VITE_[A-Z_]+)%/g, (match, key) => (key in shareCard ? escapeAttr(shareCard[key]) : match)),
    },
  }

  return {
    plugins: [react(), tailwindcss(), shareCardPlugin],
    build: {
      rolldownOptions: {
        output: {
        // Keep the framework in its own chunks.
        //
        // Bundled together with app code, every deploy changes the one hash the
        // browser has cached, so returning visitors re-download React, the
        // router and i18next along with a one-line fix. Split out, those bytes
        // are fetched once and survive every subsequent release — which matters
        // most on the slow mobile connections this is used on. Measured: a
        // redeploy costs 36 KB gzipped instead of 223 KB.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
          // Normalised so the same rules hold whether the build runs on Windows
          // (backslash paths locally) or Linux (on the deploy host).
            const path = id.split('\\').join('/')
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'vendor-react'
            if (path.includes('/react-router')) return 'vendor-router'
            if (path.includes('i18next')) return 'vendor-i18n'
            return undefined
          },
        },
      },
    },
    server: {
    // Proxy API calls to the Express backend so `/api/*` is same-origin in dev
    // (no CORS needed). Override the backend URL with VITE_API_TARGET if needed.
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
