/**
 * Primary navigation for the Super Admin dashboard.
 * `labelKey` is an i18n key resolved with t() in the sidebar; `name` is the
 * English fallback. Adding a destination = add an entry here + a matching
 * <Route> in App.jsx (+ the label in the locale files).
 *
 * `superOnly` entries are hidden from sub-admins, who work in Merchants alone
 * (the API refuses them the rest regardless).
 */
export const navigation = [
  {
    name: 'System Overview',
    labelKey: 'nav.systemOverview',
    to: '/',
    icon: 'activity',
    superOnly: true,
  },
  {
    name: 'Merchants Management',
    labelKey: 'nav.merchantsManagement',
    to: '/merchants',
    icon: 'store',
  },
  {
    name: 'Platform Revenue',
    labelKey: 'nav.revenue',
    to: '/revenue',
    icon: 'dashboard',
    superOnly: true,
  },
  {
    name: 'Subscription Plans',
    labelKey: 'nav.plans',
    to: '/plans',
    icon: 'star',
    superOnly: true,
  },
  {
    name: 'Subscriptions',
    labelKey: 'nav.subscriptions',
    to: '/subscriptions',
    icon: 'user',
    superOnly: true,
  },
  {
    name: 'Orders',
    labelKey: 'nav.orders',
    to: '/orders',
    icon: 'cart',
    superOnly: true,
  },
  {
    name: 'Merchant Reviews',
    labelKey: 'nav.adminReviews',
    to: '/reviews',
    icon: 'star',
    superOnly: true,
  },
  {
    name: 'Sub-admins',
    labelKey: 'nav.subAdmins',
    to: '/admins',
    icon: 'user',
    superOnly: true,
  },
]
