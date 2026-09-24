import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { directionFor } from './i18n/languages'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import MerchantProfileProvider from './context/MerchantProfileProvider'
import Login from './pages/Login'
import PublicMenu from './pages/public/PublicMenu'

/**
 * Route-level code splitting.
 *
 * Every page used to be imported eagerly, which meant a customer scanning a QR
 * code downloaded the entire Super Admin dashboard before their menu could
 * render — the merchants table, the revenue page, the plan builder, none of it
 * reachable from a storefront.
 *
 * The public storefront and the sign-in screen stay eager: those are the two
 * first paints that matter, and a spinner in front of them would be worse than
 * the bytes it saves.
 */
const SystemOverview = lazy(() => import('./pages/SystemOverview'))
const MerchantsPage = lazy(() => import('./pages/MerchantsPage'))
const MerchantDetails = lazy(() => import('./pages/MerchantDetails'))
const PlatformRevenue = lazy(() => import('./pages/PlatformRevenue'))
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const AdminOrders = lazy(() => import('./pages/AdminOrders'))
const AdminReviews = lazy(() => import('./pages/AdminReviews'))
const Appearance = lazy(() => import('./pages/Appearance'))
const MerchantDashboard = lazy(() => import('./pages/merchant/MerchantDashboard'))
const MerchantProfile = lazy(() => import('./pages/merchant/MerchantProfile'))
const MenuManagement = lazy(() => import('./pages/merchant/MenuManagement'))
const BannersManagement = lazy(() => import('./pages/merchant/BannersManagement'))
const MerchantOrders = lazy(() => import('./pages/merchant/MerchantOrders'))
const ReviewsManagement = lazy(() => import('./pages/merchant/ReviewsManagement'))
const ForgotPassword = lazy(() => import('./pages/merchant/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/merchant/ResetPassword'))
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'))
const MerchantLayout = lazy(() => import('./components/layout/MerchantLayout'))

/**
 * Route table. One sign-in at "/login" serves every role — the credentials
 * decide which of the two protected areas it opens. Three areas:
 *  - Super Admin: "/" and "/merchants" gated by <AdminProtectedRoute>
 *    (admin-role JWT).
 *  - Merchant Admin: "/merchant/*" gated by <ProtectedRoute> and wrapped in the
 *    profile provider.
 *  - Public storefront: "/r/:merchantId".
 */
/** Neutral placeholder while a route chunk downloads. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <span
        aria-label="Loading"
        role="status"
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
    </div>
  )
}

export default function App() {
  const { i18n } = useTranslation()

  // Keep the document's language + direction in sync with the active language
  // (Arabic and Kurdish Badini are RTL). Runs on load and on every change.
  useEffect(() => {
    document.documentElement.lang = i18n.language
    document.documentElement.dir = directionFor(i18n.language)
  }, [i18n.language])

  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* The single sign-in, shared by both roles. */}
      <Route path="/login" element={<Login />} />
      {/* The old per-role logins, kept so existing links still land. */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/merchant/login" element={<Navigate to="/login" replace />} />

      {/* Password recovery. These live under /merchant/* but must be reachable
          while signed OUT, so they are siblings of the guarded "/merchant"
          branch below rather than children of it — as children they would hit
          <ProtectedRoute> and bounce to /login, which is exactly the state the
          emailed link arrives in. The backend builds that link as
          `${APP_URL}/merchant/reset-password?token=...` (authController), so
          these two paths are fixed by the email, not free to rename. */}
      <Route path="/merchant/forgot-password" element={<ForgotPassword />} />
      <Route path="/merchant/reset-password" element={<ResetPassword />} />

      {/* Super Admin */}
      <Route element={<AdminProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<SystemOverview />} />
          <Route path="merchants" element={<MerchantsPage />} />
          <Route path="merchants/:merchantId" element={<MerchantDetails />} />
          <Route path="revenue" element={<PlatformRevenue />} />
          <Route path="plans" element={<SubscriptionPlans />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="appearance" element={<Appearance />} />
        </Route>
      </Route>

      {/* Public customer storefront */}
      <Route path="/r/:merchantId" element={<PublicMenu />} />

      {/* Merchant Admin */}
      <Route path="/merchant" element={<ProtectedRoute />}>
        <Route
          element={
            <MerchantProfileProvider>
              <MerchantLayout />
            </MerchantProfileProvider>
          }
        >
          <Route index element={<MerchantDashboard />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="banners" element={<BannersManagement />} />
          <Route path="orders" element={<MerchantOrders />} />
          <Route path="reviews" element={<ReviewsManagement />} />
          <Route path="profile" element={<MerchantProfile />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  )
}
