import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Gate for the merchant area. Renders nested routes when authenticated,
 * otherwise redirects to the shared login page, remembering where the user was
 * headed so login can send them back once they sign in as a merchant.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
