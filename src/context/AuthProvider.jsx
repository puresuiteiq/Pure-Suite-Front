import { useCallback, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './AuthContext'

/**
 * Holds the current merchant session. Initialised synchronously from
 * localStorage so there is no signed-out flash on refresh.
 *
 * Signing in happens on the shared login page (services/loginService), which
 * persists the session and hands it here via `adoptSession`. `clearSession`
 * drops it in memory only — for when a sign-in as the other role has already
 * cleared the stored one.
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())

  const adoptSession = useCallback((next) => setSession(next), [])
  const clearSession = useCallback(() => setSession(null), [])

  const logout = useCallback(async () => {
    await authService.logout()
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
