# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from `saas_project/`:

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — lint with [Oxlint](https://oxc.rs) (config in `.oxlintrc.json`)
- `npm test` — `node --test` (no test dependency). Covers i18n key parity, that
  every literal `t('…')` in `src/` resolves, that every backend error code has a
  translation, and the pure helpers in `src/utils/`.

Note: `node --test <dir>` fails on Windows here, so the script uses an explicit
glob.

## Product

A multi-tenant SaaS platform for Iraqi restaurants **and retail shops**, with
three areas. The vertical is derived from each merchant's `business_type`:
food businesses behave as a restaurant (menu, priced size variants, no
inventory), everything else as a store (catalog, brand, stock, galleries). See
`src/config/businessCategories.js` — adding a category is a label plus which
mode it behaves like, never new code.

Both admin areas share a single sign-in at `/login` (see Auth below).

- **Super Admin** (platform owner) — manages restaurant tenants ("merchants") and monitors system health. Routes `/`, `/merchants`, `/merchants/:id`, `/revenue`, `/plans`, `/subscriptions`, `/orders`, `/reviews` and `/appearance`, all gated by `AdminProtectedRoute`. Note `/appearance` is reachable from a System Overview tile, not the sidebar.
- **Merchant Admin** (a single restaurant's owner) — manages their own business. Protected area under `/merchant` (dashboard, menu management, storefront banners, reviews & feedback, profile management).
- **Public storefront** (customers) — the menu customers browse. Public route `/r/:merchantId` (a slug or a numeric id; both resolve, so QR codes printed before slugs existed still work). No auth and no admin shell. Reads the same database the merchant admin writes to, so edits appear immediately. Customers build a cart; the order is **recorded server-side first** (prices resolved from the merchant's own products, stock decremented in the same transaction) and then handed off as a pre-filled WhatsApp message.

  Password recovery also lives outside the guarded area: `/merchant/forgot-password` and `/merchant/reset-password` are siblings of the `/merchant` branch, not children, because the emailed link arrives while signed out.

## Architecture

Vite 8 + React 19, plain JSX (no TypeScript, despite `@types/react` being installed). The React Compiler is intentionally off (see `README.md`).

- **Entry:** `index.html` → `src/main.jsx` mounts `<App />` in `StrictMode`, wrapped in `<BrowserRouter>` then `<AuthProvider>`.
- **Routing:** `react-router-dom` v7. `src/App.jsx` holds the whole route table with two areas (see Product). Super Admin routes render inside `DashboardLayout`; merchant routes render inside `MerchantLayout`. Unknown paths redirect to `/`.
- **Auth:** real, backend-issued JWTs in httpOnly cookies — never readable by JS. **One login screen for both roles**: `src/pages/Login.jsx` at `/login` posts to `POST /api/auth/login`, which matches the credentials against the `admins` table then `merchants` and answers `{ role: 'admin' | 'merchant', ... }`. The role picks the panel (`/` vs `/merchant`) — the UI never guesses. A sign-in grants exactly one role, so the backend clears the other cookie and `src/services/loginService.js` clears the other display session. `/admin/login` and `/merchant/login` redirect to `/login`.
  - Two parallel contexts hold the two sessions: `Auth*` (merchant, via `useAuth()`) and `AdminAuth*` (admin, via `useAdminAuth()`), each initialised synchronously from `localStorage` so there's no signed-out flash. localStorage holds **display identity only**; the cookie is the real credential. Providers expose `adoptSession(session)` / `clearSession()` (the login page drives these after `loginService` returns) plus `logout()`.
  - Both areas are gated by `components/auth/ProtectedRoute.jsx` (merchant) and `AdminProtectedRoute.jsx` (admin); each renders `<Outlet />` when authenticated and otherwise redirects to `/login`, remembering `location` so login returns you there — but only if the remembered path belongs to the role that actually signed in.
- **Context pattern:** contexts follow a 3-file split to keep Fast Refresh / oxlint happy — `context/XContext.js` exports only the `createContext()` object; `context/XProvider.jsx` exports only the provider component; `hooks/useX.js` exports the consumer hook (which throws if used outside its provider). Applies to both `Auth*` and `MerchantProfile*`.
- **App shells:** `DashboardLayout` (Super Admin) and `MerchantLayout` (Merchant) each compose a persistent sidebar + sticky topbar around routed content via `<Outlet />`. Sidebars are fixed on `lg+` (content offset with `lg:pl-72`) and collapse to a toggleable off-canvas drawer on small screens — drawer open/close state lives in the layout. `MerchantLayout` must be rendered inside `<MerchantProfileProvider>` (wired in `App.jsx`) because it reads the shared profile for its branding.
- **Navigation is data-driven:** `src/config/navigation.js` (Super Admin) and `src/config/merchantNavigation.js` (Merchant) are the single sources of truth for their sidebar links. Adding a destination = add an entry there **and** a matching `<Route>` in `App.jsx`.
- **Styling:** Tailwind CSS **v4**, configured via the `@tailwindcss/vite` plugin (not a `tailwind.config.js`). The single directive `@import 'tailwindcss'` lives in `src/index.css`; the brand color scale (`brand-50`…`brand-900`) is defined there in an `@theme` block. Use utility classes; reach for the `brand-*` tokens for accent color.
- **Charts:** Recharts **v3**. Chart components live in `src/components/admin/` and are **lazy-loaded** (`React.lazy` + `Suspense`) so Recharts stays out of the initial bundle — follow that pattern for any new chart. Recharts needs literal color values, so charts use the brand hex `#2148f5` (the `brand-600` token) directly; keep chart text in slate ink tokens, not the series color.
- **Data layer:** pages never call `fetch` directly. `src/services/apiClient.js` is the one HTTP wrapper (base URL from `VITE_API_BASE_URL`); resource modules sit on top and **all call the real API** — every one of them except `session.js`, which is localStorage only. Components consume data through one of three patterns:
  - a plain fetch hook — `useMerchants`, `useReviews`, `useAdminReviews`, `useMerchantOrders` → `{ data, [setData,] loading, error }`. `setData` is present where a page applies an optimistic update after a mutation; hooks that only read omit it. `MerchantsPage.handleSetStatus` is the reference implementation of that pattern (a `pendingId` plus a `setData` map).
  - a hook that owns its mutations — `useMenu()` (no argument; the merchant comes from the JWT) loads the nested categories→items tree and exposes `add/edit/remove` for both levels. Each mutation awaits the service and then applies the **server's response** to state — apply-after-success, not truly optimistic: there is no rollback, and a rejection leaves state untouched and rethrows. Note `editItem` replaces the item wholesale while `editCategory` spread-merges.
  - a context — when data is shared across a layout + its pages (`MerchantProfileProvider` → `useMerchantProfile()` → `{ profile, loading, error, save }`; `save` persists **and** updates context state so the shell reflects edits live).
- **Errors:** `apiClient` throws a plain `Error` carrying `status`, `code` and `payload` (status `0` means the request never reached the server). Surface it with `translateApiError(err, t)` from `src/utils/apiError.js`, which renders the translation for a known `code` and falls back to the server's own message otherwise. The convention is an **inline banner**, not a toast — `ConfirmDialog` takes an optional `error` prop so a failed confirm reports in place rather than behind the modal. When the error is caught inside a load effect, hold the raw error in state and translate at render: translating in the effect pulls `t` into its deps and refetches on every language change.
- **Images:** never call `readAsDataURL` directly. `src/utils/image.js` validates and downscales first (1280px photos, 512px logos) and returns a data URL. Multi-file selections must go through `filesToDataUrls`, which is sequential on purpose.

### Directory layout (`src/`)

- `components/layout/` — app shells (Super Admin: `DashboardLayout`/`Sidebar`/`Topbar`; Merchant: `MerchantLayout`/`MerchantSidebar`/`MerchantTopbar`)
- `components/ui/` — reusable presentational primitives (`Button`, `Modal`, `ConfirmDialog`, `Icon`, `PageHeader`, `StatCard`). `Icon` is a name-keyed inline-SVG set; add new glyphs to its `PATHS` map. `Modal` closes on Escape/backdrop and takes an optional `footer`; put a form's submit button in the footer and link it with `form="<id>"`. `ConfirmDialog` wraps `Modal` for delete/confirm flows (`onConfirm` may be async; pass `loading`).
- `components/auth/` — `ProtectedRoute`, `AdminProtectedRoute`, `ChangePasswordForm` (shared by both panels)
- `components/<feature>/` — feature-specific components (e.g. `components/merchants/MerchantFormModal`, `components/menu/*`, `components/reviews/*`, `components/public/*`)
- `context/` — React contexts (3-file split, see Architecture): `Auth*`, `MerchantProfile*`
- `pages/` — Super Admin pages at the top level; merchant pages under `pages/merchant/`; the public storefront under `pages/public/`
- `hooks/` — data-fetching / stateful logic and context consumer hooks (incl. `useCart`, localStorage-persisted per merchant)
- `services/` — API client and per-resource data access
- `config/` — navigation configs
- `utils/` — pure helpers (`format.js` → `formatCurrency`/`formatDate`; `currency.js` → the import-free dinar formatting `format.js` wraps, so it is unit-testable; `order.js` → WhatsApp order message + `wa.me` URL; `apiError.js` → `translateApiError`; `image.js` → upload downscaling)
- `test/` — `node --test` suites (i18n parity, `t()` key resolution, error-code coverage, image maths)

### Languages and menu translations

English, Arabic and Kurdish Badini (`ku-badini`); the latter two are RTL, and
`App.jsx` keeps `document.documentElement.dir` in sync. English is the i18next
fallback, so a missing key degrades silently — which is why `npm test` asserts
both that the locales are in parity and that every literal `t('…')` in `src/`
resolves. i18next renders a missing key as the key itself, so those failures
ship as UI text rather than errors.

**Interface** strings are in `src/i18n/locales/`. **Menu content** is different:
a product name is data nobody has translated. Items and categories carry
optional `nameI18n` / `descriptionI18n` maps; whatever is left blank falls back
to the text the merchant originally typed, so a menu entered in one language
keeps working in all three.

⚠️ **The trap, if you touch this.** `apiClient` sends the active language as
`Accept-Language`, and `mapMenuItem` resolves `name` through `pickI18n`. The
merchant's own editor must therefore **never** receive resolved text:
`getMyMenu` and the create/update item responses deliberately pass **no**
language. `ItemFormModal` seeds its Name field from `name` and saves it back to
the `name` column — the required fallback — so an Arabic-UI merchant editing any
item would otherwise overwrite the original with its translation and lose it.
Only public storefront reads resolve translations.

### Orders

Orders are created `'pending'` by the public storefront and the merchant moves
them on (`pending → completed | cancelled | failed`, plus `completed →
cancelled` so a mistake can be undone). Admin order views are read-only.

Every dashboard aggregate counts `status NOT IN ('cancelled', 'failed')` — i.e.
"orders placed", not "orders fulfilled". Counting only `completed` would read
zero every morning until merchants started clicking. If you add a query over
`orders`, match that filter.

Stock is decremented inside the same transaction with a conditional
`UPDATE ... WHERE stock IS NOT NULL AND stock >= ?`. `stock IS NULL` means
"not tracked" (every restaurant item) and must stay excluded: `NULL >= ?` is
NULL, which is falsy, so an unguarded decrement fails every restaurant order.

### Currency

**IQD is the only currency.** Every stored money value — `products.price`, the `price` inside `products.variants`, `orders.total`, `order_items.unit_price` — *is* Iraqi dinars, so nothing is ever converted at display time. Render money through `formatCurrency()` (`utils/format.js`) and never hand-build a price string; the backend mirrors it where it builds strings server-side (`notificationsController.js`, `overviewController.js` MRR). Dinars have no minor unit here, so amounts are whole and price inputs use `step="1"`.

On the storefront, render a price with `<Price value={…} />` (`components/public/Price.jsx`): formatCurrency inside `<bdi translate="no">`. The amount and unit are joined by a non-breaking space so they never wrap apart.

⚠️ **Browser translation is switched off on purpose.** `index.html` carries `translate="no"` and `<meta name="google" content="notranslate">`, and the storefront root and its portals repeat it. With the old static `lang="en"`, Chrome auto-translated Arabic storefronts on customers' phones — د.ع became dirham, buttons and product names were rewritten. Don't remove it; `test/currency.test.js` also fails if another currency's name appears in `src/`.

Prices were USD until the `db:convert-iqd` migration (`backend/scripts/convertPricesToIqd.js`) multiplied every stored value by 1300; the pre-migration rows live in `products_pre_iqd` / `orders_pre_iqd` / `order_items_pre_iqd`, and `applied_migrations` stops it re-running. `db/seed.sql` now ships dinars directly, and `db:bootstrap` records that migration as applied so it can never run over already-converted seed data.

Platform plan pricing lives in two places that must agree: `PLAN_PRICES` in `overviewController.js` (the fallback when the `plans` table is empty) and the rows `db:bootstrap` seeds. If they diverge, the MRR tile on System Overview and the Subscription Plans page show different numbers.

## Conventions

- **Linting:** Oxlint (not ESLint), config in `.oxlintrc.json`. `react/rules-of-hooks` is an error; `react/only-export-components` is a warn — so keep non-component exports out of `.jsx` component files (data/config belongs in `config/` or `services/`).
- Static assets in `public/` are referenced by absolute path (`/icons.svg#...`); assets imported in code go in `src/assets/`.
- **New user-facing string?** Add the key to all three locale files, or `npm test` fails. Arabic needs the `_zero/_one/_two/_few/_many/_other` plural forms wherever `count` is interpolated.
- **New backend error the UI branches on?** Add the code to `backend/src/utils/errorCodes.js` and an `errors.<CODE>` key to all three locales — a test walks that registry and enforces it.
- **New DB column?** It needs the column in `backend/db/schema.sql`, an idempotent `backend/scripts/add*.js` that records itself in `applied_migrations`, a `db:*` entry in `backend/package.json`, a row in the backend README's migration table, and an `information_schema`-guarded read/write. The guards are what keep the API working against a database that has not run every migration.
