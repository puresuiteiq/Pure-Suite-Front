import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth'

/**
 * The main admin's pages. A sub-admin — who works in Merchants alone — is
 * sent there instead of meeting a page whose every request the API refuses.
 * Rendered inside AdminProtectedRoute, so the admin is already signed in.
 */
export default function SuperAdminRoute() {
  const { isSuperAdmin } = useAdminAuth()
  if (!isSuperAdmin) return <Navigate to="/merchants" replace />
  return <Outlet />
}
