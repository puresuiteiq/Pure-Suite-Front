import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/useAdminAuth'

/**
 * Gate for the Super Admin area. Renders nested routes when an admin is
 * authenticated, otherwise redirects to the shared login page (remembering
 * where the user was headed).
 */
export default function AdminProtectedRoute() {
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
