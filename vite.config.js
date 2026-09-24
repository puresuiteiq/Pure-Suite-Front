import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
