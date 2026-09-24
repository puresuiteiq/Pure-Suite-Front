import { createContext } from 'react'

/**
 * Admin auth context value: { session, isAuthenticated, login, logout }.
 * Provided by <AdminAuthProvider>; consume via useAdminAuth.
 * Separate from the merchant AuthContext so the two roles are independent.
 */
export const AdminAuthContext = createContext(null)
