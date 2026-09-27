import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import FormField from '../components/ui/FormField'
import { controlClass } from '../utils/form'
import { subAdminsService } from '../services/subAdminsService'
import { translateApiError } from '../utils/apiError'

/**
 * The main admin's sub-admins. A sub-admin signs in at the same /login, adds
 * merchants, and manages only the ones they added — never deleting or
 * suspending them. Their merchants show here as a count and, in Merchants,
 * under "Added by".
 */
export default function SubAdminsPage() {
  const { t } = useTranslation()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [adding, setAdding] = useState(false)
  // { name, email, tempPassword, reset? } — shown once, then gone for good.
  const [credentials, setCredentials] = useState(null)
  const [toReset, setToReset] = useState(null)
  const [toStatus, setToStatus] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    let active = true
    subAdminsService
      .list()
      .then((rows) => active && setAdmins(rows))
      .catch((err) => active && setLoadError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const resetPassword = async () => {
    setBusy(true)
    setActionError(null)
    try {
      const { tempPassword } = await subAdminsService.resetPassword(toReset.id)
      setCredentials({ name: toReset.name, email: toReset.email, tempPassword, reset: true })
      setToReset(null)
    } catch (err) {
      setActionError(translateApiError(err, t))
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = async () => {
    setBusy(true)
    setActionError(null)
    try {
      const nextStatus = toStatus.status === 'blocked' ? 'active' : 'blocked'
      const updated = await subAdminsService.setStatus(toStatus.id, nextStatus)
      setAdmins((prev) => prev.map((admin) => (admin.id === updated.id ? updated : admin)))
      setToStatus(null)
    } catch (err) {
      setActionError(translateApiError(err, t))
      throw err
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await subAdminsService.remove(toDelete.id)
      setAdmins((prev) => prev.filter((a) => a.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      setActionError(translateApiError(err, t))
      throw err
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('subAdmins.title')}
        subtitle={t('subAdmins.subtitle')}
        actions={
          <Button icon="plus" onClick={() => setAdding(true)}>
            {t('subAdmins.add')}
          </Button>
        }
      />

      {/* What a sub-admin can and can't do, so the owner knows before adding one. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="luxury-glass luxury-card rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <Icon name="check" className="h-4 w-4" />
            {t('subAdmins.canTitle')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('subAdmins.can')}</p>
        </div>
        <div className="luxury-glass luxury-card rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-300">
            <Icon name="ban" className="h-4 w-4" />
            {t('subAdmins.cannotTitle')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('subAdmins.cannot')}</p>
        </div>
      </div>

      {actionError && !toReset && !toStatus && !toDelete && (
        <p role="alert" className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="luxury-glass luxury-card rounded-2xl p-8 text-center text-sm text-slate-500">
          {t('subAdmins.loading')}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-center text-sm text-red-600 dark:text-red-300">
          {translateApiError(loadError, t)}
        </div>
      ) : admins.length === 0 ? (
        <div className="luxury-glass luxury-card rounded-2xl border-dashed p-10 text-center">
          <Icon name="user" className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{t('subAdmins.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('subAdmins.emptyHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {admins.map((admin) => {
            const blocked = admin.status === 'blocked'
            return (
            <li key={admin.id} className={`luxury-glass luxury-card flex items-center gap-4 rounded-2xl p-4 ${blocked ? 'opacity-75' : ''}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600/10 text-base font-bold text-brand-600 dark:text-brand-300">
                {(admin.name || admin.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{admin.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                  {admin.email}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('subAdmins.merchantCount', { count: admin.merchantCount })}
                </p>
                {blocked && (
                  <span className="mt-2 inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-300">
                    {t('subAdmins.blocked')}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  to={`/merchants?createdBy=${encodeURIComponent(admin.id)}`}
                  className="inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 btn-glow btn-glow-neutral luxury-glass px-2.5 py-1.5 text-xs gap-1 text-slate-700 hover:bg-white/80 focus-visible:ring-amber-400 dark:text-slate-100"
                  aria-label={t('subAdmins.viewMerchants')}
                  title={t('subAdmins.viewMerchants')}
                >
                  <Icon name="eye" className="h-4 w-4" />
                </Link>
                <Button
                  size="sm"
                  variant={blocked ? 'secondary' : 'danger'}
                  icon={blocked ? 'check' : 'ban'}
                  aria-label={blocked ? t('subAdmins.unblock') : t('subAdmins.block')}
                  title={blocked ? t('subAdmins.unblock') : t('subAdmins.block')}
                  onClick={() => (setActionError(null), setToStatus(admin))}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon="lock"
                  aria-label={t('subAdmins.resetPassword')}
                  title={t('subAdmins.resetPassword')}
                  onClick={() => (setActionError(null), setToReset(admin))}
                />
                <Button
                  size="sm"
                  variant="danger"
                  icon="trash"
                  aria-label={t('subAdmins.delete')}
                  title={t('subAdmins.delete')}
                  onClick={() => (setActionError(null), setToDelete(admin))}
                />
              </div>
            </li>
          )})}
        </ul>
      )}

      <AddSubAdminModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(created) => {
          setAdmins((prev) => [created, ...prev])
          setAdding(false)
          setCredentials(created)
        }}
      />

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />

      <ConfirmDialog
        open={Boolean(toReset)}
        title={t('subAdmins.resetTitle')}
        message={t('subAdmins.resetConfirm', { name: toReset?.name })}
        confirmLabel={t('subAdmins.resetPassword')}
        loading={busy}
        error={toReset ? actionError : null}
        onConfirm={resetPassword}
        onCancel={() => (setActionError(null), setToReset(null))}
      />
      <ConfirmDialog
        open={Boolean(toStatus)}
        title={toStatus?.status === 'blocked' ? t('subAdmins.unblockTitle') : t('subAdmins.blockTitle')}
        message={
          toStatus?.status === 'blocked'
            ? t('subAdmins.unblockConfirm', { name: toStatus?.name })
            : t('subAdmins.blockConfirm', { name: toStatus?.name })
        }
        confirmLabel={toStatus?.status === 'blocked' ? t('subAdmins.unblock') : t('subAdmins.block')}
        destructive={toStatus?.status !== 'blocked'}
        loading={busy}
        error={toStatus ? actionError : null}
        onConfirm={toggleStatus}
        onCancel={() => (setActionError(null), setToStatus(null))}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('subAdmins.deleteTitle')}
        message={t('subAdmins.deleteConfirm', { name: toDelete?.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={busy}
        error={toDelete ? actionError : null}
        successMessage={t('common.deletedSuccess')}
        onConfirm={remove}
        onCancel={() => (setActionError(null), setToDelete(null))}
      />
    </div>
  )
}

function AddSubAdminModal({ open, onClose, onCreated }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setName('')
      setEmail('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      onCreated(await subAdminsService.create({ name: name.trim(), email: email.trim() }))
    } catch (err) {
      setError(translateApiError(err, t))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('subAdmins.addTitle')}
      icon="user"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="sub-admin-form" icon="plus" disabled={submitting}>
            {submitting ? t('subAdmins.adding') : t('subAdmins.add')}
          </Button>
        </>
      }
    >
      <form id="sub-admin-form" onSubmit={submit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        <FormField label={t('subAdmins.name')} required icon="user">
          <input
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={150}
            className={controlClass()}
          />
        </FormField>
        <FormField label={t('subAdmins.email')} required icon="mail" hint={t('subAdmins.emailHint')}>
          <input
            required
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={190}
            className={controlClass()}
          />
        </FormField>
      </form>
    </Modal>
  )
}

/** The sign-in details, shown once: the password is never retrievable again. */
function CredentialsModal({ credentials, onClose }) {
  const { t } = useTranslation()
  if (!credentials) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={credentials.reset ? t('subAdmins.resetDoneTitle') : t('subAdmins.createdTitle')}
      icon="check"
      footer={<Button onClick={onClose}>{t('common.done')}</Button>}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t('subAdmins.createdIntro', { name: credentials.name })}
        </p>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5">
          <CopyRow label={t('subAdmins.email')} value={credentials.email} icon="mail" />
          <CopyRow label={t('subAdmins.password')} value={credentials.tempPassword} icon="lock" />
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('subAdmins.copyNote')}</span>
        </div>
      </div>
    </Modal>
  )
}

function CopyRow({ label, value, icon }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the value is on screen to copy by hand.
    }
  }
  return (
    <div className="flex items-center gap-3">
      <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-white" dir="ltr">
          {value}
        </p>
      </div>
      <Button size="sm" variant="secondary" icon={copied ? 'check' : 'copy'} onClick={copy}>
        {copied ? t('subAdmins.copied') : t('subAdmins.copy')}
      </Button>
    </div>
  )
}
