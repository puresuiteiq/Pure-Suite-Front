import { useCallback, useEffect, useMemo, useState } from 'react'
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

  // The stored session says what the role was at sign-in; the server knows
  // what it is now (a session from before sub-admins existed has no role at
  // all). Refresh it once per load. The server enforces the role regardless —
  // this only decides what the panel offers.
  const adminId = session?.adminId
  useEffect(() => {
    if (!adminId) return undefined
    let active = true
    adminAuthService
      .me()
      .then((me) => {
        if (!active) return
        setSession((prev) => {
          if (!prev || prev.role === me.role) return prev
          const next = { ...prev, role: me.role }
          adminAuthService.setSession(next)
          return next
        })
      })
      .catch(() => {
        // A 401 has already cleared the stored session in apiClient.
      })
    return () => {
      active = false
    }
  }, [adminId])

  const logout = useCallback(async () => {
    await adminAuthService.logout()
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      // Anything but an explicit 'sub' is the main admin.
      isSuperAdmin: Boolean(session) && session.role !== 'sub',
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
