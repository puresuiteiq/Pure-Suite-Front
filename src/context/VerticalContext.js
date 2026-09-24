import { createContext } from 'react'

/**
 * The active business vertical ('restaurant' | 'store') for the subtree being
 * rendered — the merchant's own type in the admin area, or the storefront
 * merchant's type on the public page. Drives vertical-aware wording via
 * useVerticalT. Defaults to 'restaurant' (the platform's original vertical and
 * the base wording), so anything rendered outside a provider reads as today.
 */
export const VerticalContext = createContext('restaurant')
