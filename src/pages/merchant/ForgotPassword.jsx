import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { authService } from '../../services/authService'
import { translateApiError } from '../../utils/apiError'

/**
 * "Forgot password" — request a reset link by email. The response is always
 * generic (never reveals whether an account exists); in development the backend
 * returns the link directly so it can be tested without an email service.
 */
export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await authService.requestPasswordReset(email.trim())
      setDevUrl(res?.devResetUrl ?? null)
      setSent(true)
    } catch (err) {
      setError(translateApiError(err, t, 'auth.resetError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Explicit dark variants throughout: in dark mode the text here turned
    // light while the white card stayed white, so the form was near-invisible.
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
            {t('auth.forgotTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('auth.forgotSubtitle')}
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="check" className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-600">{t('auth.resetLinkSent')}</p>

            {devUrl && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-start">
                <p className="text-xs font-medium text-amber-800">
                  {t('auth.devLinkNote')}
                </p>
                <Link
                  to={devUrl.replace(/^https?:\/\/[^/]+/, '')}
                  className="mt-1 block break-all text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {devUrl}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900"
            noValidate
          >
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
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
                  placeholder="owner@business.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/15 dark:bg-slate-950 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('auth.sending') : t('auth.sendResetLink')}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-slate-600 dark:text-slate-400">
          <Link to="/merchant/login" className="hover:text-slate-900 dark:hover:text-white">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
