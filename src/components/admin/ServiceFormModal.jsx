import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import Select from '../ui/Select'
import { controlClass } from '../../utils/form'
import { translateApiError } from '../../utils/apiError'

const STATUSES = ['operational', 'degraded', 'down']

/**
 * Create/edit a service-status entry. `service` null → create mode.
 * Calls async `onSubmit({ name, status, uptime })` and closes on success.
 */
export default function ServiceFormModal({ open, onClose, onSubmit, service }) {
  const { t } = useTranslation()
  const isEdit = Boolean(service)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('operational')
  const [uptime, setUptime] = useState('100')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(service?.name ?? '')
      setStatus(service?.status ?? 'operational')
      setUptime(service ? String(service.uptime) : '100')
      setError(null)
      setSubmitting(false)
    }
  }, [open, service])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('overview.services.nameRequired'))
      return
    }
    const uptimeNum = Number(uptime)
    if (!Number.isFinite(uptimeNum) || uptimeNum < 0 || uptimeNum > 100) {
      setError(t('overview.services.uptimeInvalid'))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), status, uptime: uptimeNum })
      onClose()
    } catch (err) {
      setError(translateApiError(err, t, 'overview.services.somethingWrong'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('overview.services.editTitle')
          : t('overview.services.addTitle')
      }
      icon="activity"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="service-form" disabled={submitting}>
            {submitting
              ? t('common.saving')
              : isEdit
                ? t('common.saveShort')
                : t('overview.services.add')}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <FormField label={t('overview.services.name')}>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={t('overview.services.namePlaceholder')}
            autoFocus
            className={controlClass()}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('overview.services.status')}>
            <Select
              value={status}
              onChange={(v) => setStatus(v)}
              options={STATUSES.map((s) => ({
                value: s,
                label: t(`overview.status.${s}`),
              }))}
            />
          </FormField>

          <FormField label={t('overview.services.uptime')}>
            <input
              type="number"
              value={uptime}
              onChange={(e) => {
                setUptime(e.target.value)
                setError(null)
              }}
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              className={controlClass()}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
