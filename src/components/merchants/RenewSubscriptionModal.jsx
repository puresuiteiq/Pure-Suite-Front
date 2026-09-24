import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import DatePicker from '../ui/DatePicker'
import { translateApiError } from '../../utils/apiError'

/**
 * Lets the Super Admin pick the merchant's new subscription expiry date from
 * a calendar, instead of always applying the plan's fixed billing period.
 * `defaultDate` pre-selects a sensible suggestion (the caller computes it —
 * usually today/current-expiry plus the plan's period, matching what the old
 * one-click Renew used to land on), fully editable before confirming. Calls
 * async `onSubmit(date)` with a 'YYYY-MM-DD' string.
 */
export default function RenewSubscriptionModal({ open, onClose, onSubmit, merchant, defaultDate }) {
  const { t } = useTranslation()
  const [date, setDate] = useState(defaultDate ?? '')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? '')
      setError(null)
      setSubmitting(false)
    }
  }, [open, defaultDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date) {
      setError(t('subscriptions.renewModal.invalidDate'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(date)
      onClose()
    } catch (err) {
      setError(translateApiError(err, t, 'merchantForm.somethingWrong'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('subscriptions.renewModal.title')}
      subtitle={merchant?.name}
      icon="clock"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="renew-subscription-form" disabled={submitting}>
            {submitting ? t('common.working') : t('subscriptions.renewModal.confirm')}
          </Button>
        </>
      }
    >
      <form id="renew-subscription-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <FormField label={t('subscriptions.renewModal.newExpiry')} icon="clock">
          <DatePicker value={date} onChange={setDate} />
        </FormField>
      </form>
    </Modal>
  )
}
