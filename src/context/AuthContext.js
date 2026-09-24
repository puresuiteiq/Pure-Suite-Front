import { createContext } from 'react'

/**
 * Auth context value: { session, isAuthenticated, login, logout }.
 * Provided by <AuthProvider>; consume via the useAuth hook.
 * Kept in its own module so the provider file only exports a component
 * (keeps Fast Refresh / oxlint's only-export-components happy).
 */
export const AuthContext = createContext(null)
