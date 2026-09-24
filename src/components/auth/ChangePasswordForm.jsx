import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { translateApiError } from '../../utils/apiError'

/**
 * Self-service password change, shared by the Super Admin and merchant panels.
 *
 * One component because the two differ only in which service call they make
 * and where they are mounted — admin in a modal off the user menu, merchant as
 * a card on their profile page. The validation, the states, and the wording are
 * the same job in both.
 *
 * `onSubmit` receives `{ currentPassword, newPassword }` and should reject on
 * failure; the message is rendered inline, matching how every other form in
 * this app reports errors.
 *
 * The current password is required by the server too — this check is only here
 * to save a round trip, never as the real gate.
 */
const MIN_LENGTH = 8

export default function ChangePasswordForm({ onSubmit, onDone, autoFocus = false }) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (next.length < MIN_LENGTH) {
      setError(t('auth.passwordMinLength', { min: MIN_LENGTH }))
      return
    }
    if (next !== confirm) {
      setError(t('auth.passwordsNoMatch'))
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
      onDone?.()
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const field = (label, value, setValue, autoComplete, focus = false) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <div className="relative">
        <Icon
          name="lock"
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
            setDone(false)
          }}
          autoComplete={autoComplete}
          autoFocus={focus}
          placeholder="••••••••"
          className="form-input ps-9"
        />
      </div>
    </label>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {done && !error && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {t('auth.passwordChanged')}
        </p>
      )}

      {field(t('auth.currentPassword'), current, setCurrent, 'current-password', autoFocus)}
      {field(t('auth.newPassword'), next, setNext, 'new-password')}
      {field(t('auth.confirmPassword'), confirm, setConfirm, 'new-password')}

      <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <input
          type="checkbox"
          checked={show}
          onChange={(event) => setShow(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
        />
        {t('auth.showPassword')}
      </label>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t('auth.updating') : t('auth.updatePassword')}
      </Button>

      <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">
        {t('auth.sessionsStayActive')}
      </p>
    </form>
  )
}
