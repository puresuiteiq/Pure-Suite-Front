/**
 * Primary navigation for the Super Admin dashboard.
 * `labelKey` is an i18n key resolved with t() in the sidebar; `name` is the
 * English fallback. Adding a destination = add an entry here + a matching
 * <Route> in App.jsx (+ the label in the locale files).
 */
export const navigation = [
  {
    name: 'System Overview',
    labelKey: 'nav.systemOverview',
    to: '/',
    icon: 'activity',
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
  },
  {
    name: 'Subscription Plans',
    labelKey: 'nav.plans',
    to: '/plans',
    icon: 'star',
  },
  {
    name: 'Subscriptions',
    labelKey: 'nav.subscriptions',
    to: '/subscriptions',
    icon: 'user',
  },
  {
    name: 'Orders',
    labelKey: 'nav.orders',
    to: '/orders',
    icon: 'cart',
  },
  {
    name: 'Merchant Reviews',
    labelKey: 'nav.adminReviews',
    to: '/reviews',
    icon: 'star',
  },
]
