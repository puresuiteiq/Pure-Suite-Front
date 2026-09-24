import { useCallback, useMemo, useState } from 'react'
import { adminAuthService } from '../services/adminAuthService'
import { AdminAuthContext } from './AdminAuthContext'

/**
 * Holds the current Super Admin session, initialised synchronously from
 * localStorage so there is no signed-out flash on refresh.
 *
 * Signing in happens on the shared login page (services/loginService), which
 * persists the session and hands it here via `adoptSession`. `clearSession`
 * drops it in memory only — for when a sign-in as the other role has already
 * cleared the stored one.
 */
export default function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(() => adminAuthService.getSession())

  const adoptSession = useCallback((next) => setSession(next), [])
  const clearSession = useCallback(() => setSession(null), [])

  const logout = useCallback(async () => {
    await adminAuthService.logout()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      adoptSession,
      clearSession,
      logout,
    }),
    [session, adoptSession, clearSession, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
