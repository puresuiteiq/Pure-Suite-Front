import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import Select from '../ui/Select'
import DatePicker from '../ui/DatePicker'
import { controlClass } from '../../utils/form'
import { BUSINESS_CATEGORIES, isKnownCategory } from '../../config/businessCategories'
import { usePlans } from '../../hooks/usePlans'
import { translateApiError } from '../../utils/apiError'

const FALLBACK_PLANS = ['Starter', 'Growth', 'Enterprise']
const FALLBACK_PLAN_DAYS = 30

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

function subscriptionDatesForPlan(periodDays = FALLBACK_PLAN_DAYS) {
  const starts = new Date()
  starts.setHours(0, 0, 0, 0)
  const ends = new Date(starts)
  ends.setDate(ends.getDate() + Math.max(1, Number(periodDays) || FALLBACK_PLAN_DAYS))
  return {
    subscriptionStartsAt: ymd(starts),
    subscriptionExpiresAt: ymd(ends),
  }
}

/**
 * Super Admin edit-merchant modal. Edits business name, owner, email, phone and
 * plan (not password/status — status is handled by the row's Activate/Deactivate).
 * Calls async `onSubmit({ name, owner, email, phone, plan })`.
 */
export default function MerchantEditModal({ open, onClose, onSubmit, merchant }) {
  const { t } = useTranslation()
  const { data: plans } = usePlans()
  const planOptions = plans.filter((p) => p.active).map((p) => p.name)
  const planList = planOptions.length ? planOptions : FALLBACK_PLANS
  const planByName = new Map(plans.map((plan) => [plan.name, plan]))
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && merchant) {
      setForm({
        name: merchant.name ?? '',
        slug: merchant.slug ?? '',
        businessType: merchant.businessType ?? 'restaurant',
        owner: merchant.owner ?? '',
        email: merchant.email ?? '',
        phone: merchant.phone ?? '',
        plan: merchant.plan ?? 'Starter',
        subscriptionStartsAt: merchant.subscriptionStartsAt ?? '',
        subscriptionExpiresAt: merchant.subscriptionExpiresAt ?? '',
      })
      setErrors({})
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open, merchant])

  if (!form) return null

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = t('merchantForm.nameRequired')
    if (!form.email.trim()) next.email = t('merchantForm.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = t('merchantForm.emailInvalid')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        name: form.name.trim(),
        // Only sent when set — an untouched blank keeps the existing link
        // rather than asking the backend to clear it.
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
        businessType: form.businessType,
        owner: form.owner.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        plan: form.plan,
        subscriptionStartsAt: form.subscriptionStartsAt || null,
        subscriptionExpiresAt: form.subscriptionExpiresAt || null,
      })
      onClose()
    } catch (err) {
      setSubmitError(translateApiError(err, t, 'merchantForm.somethingWrong'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('merchants.editTitle')}
      subtitle={merchant?.name}
      icon="store"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="merchant-edit-form" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.saveShort')}
          </Button>
        </>
      }
    >
      <form
        id="merchant-edit-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <FormField
          label={t('merchantForm.businessName')}
          error={errors.name}
          icon="store"
          required
        >
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            aria-invalid={Boolean(errors.name)}
            className={controlClass(errors.name)}
          />
        </FormField>

        <FormField label={t('merchantForm.storefrontLink')} icon="book" error={errors.slug}>
          <input
            type="text"
            value={form.slug}
            onChange={update('slug')}
            placeholder={t('merchantForm.storefrontLinkPlaceholder')}
            dir="ltr"
            aria-invalid={Boolean(errors.slug)}
            className={`${controlClass(errors.slug)} text-start`}
          />
          {/* Renaming this changes the merchant's public address — anything
              already printed on a QR code keeps working via /r/<id>. */}
          <p dir="ltr" className="mt-1.5 text-start text-xs text-slate-500 dark:text-slate-400">
            {typeof window === 'undefined' ? '' : window.location.host}/r/
            {form.slug || merchant.id}
          </p>
        </FormField>

        <FormField label={t('merchantForm.businessType')} icon="store" iconPlacement="first-control">
          <Select
            value={isKnownCategory(form.businessType) ? form.businessType : 'other'}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                businessType: v === 'other' ? '' : v,
              }))
            }
            options={[
              ...BUSINESS_CATEGORIES.map(({ key }) => ({
                value: key,
                label: t(`businessTypes.${key}`),
              })),
              { value: 'other', label: t('businessTypes.other') },
            ]}
          />
          {!isKnownCategory(form.businessType) && (
            <input
              type="text"
              value={form.businessType}
              onChange={update('businessType')}
              placeholder={t('merchantForm.businessTypeCustomPlaceholder')}
              className={`${controlClass()} mt-2`}
            />
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('merchantForm.ownerName')} icon="user">
            <input
              type="text"
              value={form.owner}
              onChange={update('owner')}
              className={controlClass()}
            />
          </FormField>
          <FormField label={t('merchantForm.phone')} icon="phone">
            <input
              type="tel"
              value={form.phone}
              onChange={update('phone')}
              dir="ltr"
              className={`${controlClass()} text-start`}
            />
          </FormField>
        </div>

        <FormField
          label={t('merchantForm.email')}
          error={errors.email}
          icon="mail"
          required
        >
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            dir="ltr"
            aria-invalid={Boolean(errors.email)}
            className={`${controlClass(errors.email)} text-start`}
          />
        </FormField>

        <FormField label={t('merchantForm.plan')} icon="star">
          <Select
            value={form.plan}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                plan: v,
                ...subscriptionDatesForPlan(planByName.get(v)?.periodDays ?? FALLBACK_PLAN_DAYS),
              }))
            }
            /* Keep the merchant's current plan selectable even if it's now
               inactive or was renamed away. */
            options={(planList.includes(form.plan)
              ? planList
              : [form.plan, ...planList]
            ).map((plan) => ({ value: plan, label: t(`plans.${plan}`, plan) }))}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('merchantForm.subscriptionStarts')} icon="clock">
            <DatePicker
              value={form.subscriptionStartsAt}
              onChange={(v) => setForm((prev) => ({ ...prev, subscriptionStartsAt: v }))}
            />
          </FormField>
          <FormField label={t('merchantForm.subscriptionEnds')} icon="clock">
            <DatePicker
              value={form.subscriptionExpiresAt}
              onChange={(v) => setForm((prev) => ({ ...prev, subscriptionExpiresAt: v }))}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
