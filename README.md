# RestoSaaS — Frontend

Vite 8 + React 19 (plain JSX), Tailwind CSS v4, react-router v7, i18next.

One app serves three audiences:

- **Super Admin** — the platform owner: merchants, plans, subscriptions,
  revenue, orders, reviews, appearance.
- **Merchant Admin** (`/merchant/*`) — one shop's owner: dashboard, menu or
  catalog, orders, reviews, profile.
- **Public storefront** (`/r/:slugOrId`) — what customers browse. No auth, no
  admin shell. Customers build a cart and the order is recorded server-side,
  then handed off to WhatsApp.

Both admin areas share a single sign-in at `/login`; the credentials decide
which panel opens.

## Commands

```bash
npm run dev       # Vite dev server, proxies /api to the backend
npm run build     # production build to dist/
npm run preview   # serve the build
npm run lint      # oxlint
npm test          # node --test — i18n and utility suites, no extra deps
```

The backend must be running for anything beyond the login screen. See
[`../backend/README.md`](../backend/README.md) — start there first, since
`db:bootstrap` is what creates the account you sign in with.

## Languages

English, Arabic and Kurdish Badini, the latter two right-to-left. English is the
i18next fallback, so a missing key silently degrades rather than breaking — which
is why `npm test` enforces two rules:

- every key in `en.json` exists in the other two locales, and
- every literal `t('…')` used anywhere in `src/` actually resolves.

The second one matters most: i18next renders a missing key as the key itself, so
that failure ships as UI text rather than an error.

Menu content is translated separately from the interface. A merchant types a
product name once and can add per-language versions; anything left blank falls
back to what they typed. `apiClient` sends the active language as
`Accept-Language`, and the backend resolves it for public reads only — the
merchant's own editor always shows the original, so editing in Arabic can never
overwrite it.

## Currency

IQD only, whole dinars, never converted at display time. Render money through
`formatCurrency()` / `formatAmount()` in `src/utils/format.js`; price inputs use
`step="1"`.

## Environment

All optional — the defaults work for local development against the backend on
port 4000. Copy `.env.example` to `.env` to change them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PUBLIC_SITE_URL` | _(unset)_ | Fallback domain for storefront links and QR codes (`<domain>/r/<slug>`). The authoritative value is the backend's `APP_URL`, read from `GET /api/public/config`; set this only when the frontend is deployed apart from its API. Last resort is the browser's own origin. |
| `VITE_API_BASE_URL` | `/api` | Base URL for API calls. |
| `VITE_API_TARGET` | `http://localhost:4000` | Dev server only: backend the `/api` proxy points at. |

## Notes

- **Images** are downscaled in the browser before upload (`src/utils/image.js`)
  and stored as data URLs. 1280px for product photos, 512px for logos.
- **Errors** from the API carry a `code`; `src/utils/apiError.js` translates the
  ones it knows and falls back to the server's own text otherwise.
- The React Compiler is deliberately off — see
  [the React docs](https://react.dev/learn/react-compiler/installation) if you
  want to enable it.

Architecture, conventions and the reasoning behind them live in
[`CLAUDE.md`](CLAUDE.md).
