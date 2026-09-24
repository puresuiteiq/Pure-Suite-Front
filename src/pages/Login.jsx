import { useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import { login } from '../services/loginService'
import { useAuth } from '../hooks/useAuth'
import { useAdminAuth } from '../hooks/useAdminAuth'
import logo from '../assets/picture/logo1.png'
import { translateApiError } from '../utils/apiError'

/** The merchant area is "/merchant" and its children — but not "/merchants". */
const isMerchantArea = (path) =>
  path === '/merchant' || path.startsWith('/merchant/')

/**
 * The one sign-in screen. Super Admins and merchants use the same form; the
 * backend matches the credentials against both account tables and names the
 * role, which is what picks the panel to land on.
 */
export default function Login() {
  const { isAuthenticated: isAdmin, adoptSession: adoptAdmin, clearSession: clearAdmin } =
    useAdminAuth()
  const {
    isAuthenticated: isMerchant,
    adoptSession: adoptMerchant,
    clearSession: clearMerchant,
  } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Where a guard bounced this visitor from, if anywhere.
  const from = location.state?.from?.pathname

  // Honour that path only if it belongs to the role that actually signed in —
  // an admin who was bounced from a merchant page still starts at the admin
  // dashboard, and vice versa.
  const destinationFor = (role) => {
    const home = role === 'admin' ? '/' : '/merchant'
    if (!from) return home
    return isMerchantArea(from) === (role === 'merchant') ? from : home
  }

  // Already signed in? Skip the form. One session at a time, so at most one of
  // these is true.
  if (isAdmin) return <Navigate to={destinationFor('admin')} replace />
  if (isMerchant) return <Navigate to={destinationFor('merchant')} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { role, session } = await login({ email, password })
      // Signing in as one role ends the other's session (loginService has
      // already dropped its stored copy — this clears the in-memory one).
      if (role === 'admin') {
        clearMerchant()
        adoptAdmin(session)
      } else {
        clearAdmin()
        adoptMerchant(session)
      }
      navigate(destinationFor(role), { replace: true })
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'luxury-input w-full py-3 ps-9 text-sm placeholder:text-slate-400 focus:outline-none'

  return (
    <div className="luxury-login relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute -start-32 top-0 h-96 w-96 rounded-full bg-slate-900/[0.04] blur-3xl dark:bg-white/[0.06]" />
      <div className="absolute -end-32 bottom-0 h-96 w-96 rounded-full bg-slate-900/[0.03] blur-3xl dark:bg-white/[0.04]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-1 flex h-24 w-44 items-center justify-center">
            <img src={logo} alt="RestoSaaS" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t('auth.portal')}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{t('auth.portalSubtitle')}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="luxury-login-card space-y-5 rounded-3xl p-7 text-slate-900 dark:text-white"
          noValidate
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-100">
              {t('auth.email')}
            </span>
            <div className="relative">
              <Icon
                name="mail"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={`${inputClass} pe-3`}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-100">
              {t('auth.password')}
            </span>
            <div className="relative">
              <Icon
                name="lock"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${inputClass} pe-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                aria-pressed={showPassword}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
              </button>
            </div>
          </label>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>

          {/* The only entry point to password recovery. Without it the reset
              flow is unreachable for anyone who has actually forgotten their
              password. */}
          <p className="text-center text-sm">
            <Link
              to="/merchant/forgot-password"
              className="font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('auth.forgotPasswordLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
