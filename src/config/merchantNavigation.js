/**
 * Navigation for the Merchant Admin dashboard.
 * `labelKey` is an i18n key resolved with t() in the sidebar; `name` is the
 * English fallback. Add a destination = add an entry here + a matching <Route>
 * under /merchant (+ the label in the locale files).
 */
export const merchantNavigation = [
  {
    name: 'Dashboard',
    labelKey: 'nav.dashboard',
    to: '/merchant',
    icon: 'dashboard',
  },
  {
    name: 'Menu Management',
    labelKey: 'nav.menuManagement',
    to: '/merchant/menu',
    icon: 'book',
  },
  {
    name: 'Storefront Banners',
    labelKey: 'nav.banners',
    to: '/merchant/banners',
    icon: 'image',
  },
  {
    name: 'Orders',
    labelKey: 'nav.orders',
    to: '/merchant/orders',
    icon: 'cart',
  },
  {
    name: 'Reviews & Feedback',
    labelKey: 'nav.reviews',
    to: '/merchant/reviews',
    icon: 'star',
  },
  {
    name: 'Profile Management',
    labelKey: 'nav.profile',
    to: '/merchant/profile',
    icon: 'user',
  },
]
