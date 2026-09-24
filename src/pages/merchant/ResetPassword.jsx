import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { authService } from '../../services/authService'
import { translateApiError } from '../../utils/apiError'

const MIN_LENGTH = 8

/**
 * "Reset password" — reached from the emailed link (?token=…). Validates the
 * token up front, then lets the merchant set a new password.
 */
export default function ResetPassword() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  // checking → valid → done, or invalid at any point.
  const [status, setStatus] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    let active = true
    authService
      .validateResetToken(token)
      .then((r) => active && setStatus(r?.valid ? 'valid' : 'invalid'))
      .catch(() => active && setStatus('invalid'))
    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < MIN_LENGTH) {
      setError(t('auth.passwordMinLength', { min: MIN_LENGTH }))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordsNoMatch'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await authService.resetPassword({ token, password })
      setStatus('done')
    } catch (err) {
      setError(translateApiError(err, t, 'auth.resetError'))
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-slate-950 dark:text-white'

  return (
    // Explicit dark variants throughout: in dark mode the text here turned
    // light while the white card stayed white, so the page was near-invisible.
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-end gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold on-brand">
            R
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('auth.resetTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('auth.resetSubtitle')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          {status === 'checking' && (
            <p className="py-4 text-center text-sm text-slate-500">
              {t('auth.validatingLink')}
            </p>
          )}

          {status === 'invalid' && (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="ban" className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-600">{t('auth.resetInvalid')}</p>
              <Link
                to="/merchant/forgot-password"
                className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t('auth.requestNewLink')}
              </Link>
            </div>
          )}

          {status === 'done' && (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-600">{t('auth.resetSuccess')}</p>
              <Link
                to="/merchant/login"
                className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          )}

          {status === 'valid' && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t('auth.newPassword')}
                </span>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoFocus
                    className={inputClass}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t('auth.confirmPassword')}
                </span>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>
              </label>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t('auth.updating') : t('auth.updatePassword')}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-600 dark:text-slate-400">
          <Link to="/merchant/login" className="hover:text-slate-900 dark:hover:text-white">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
