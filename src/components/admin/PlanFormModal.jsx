import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import FormField from '../ui/FormField'
import Select from '../ui/Select'
import { controlClass } from '../../utils/form'
import { uid } from '../../utils/uid'
import { translateApiError } from '../../utils/apiError'

const EMPTY = {
  name: '', price: '', period: 'monthly', periodDays: '30',
  description: '', features: [], active: true,
}

const PERIOD_DAYS = { monthly: 30, yearly: 365 }

/** Seed the local form from a plan record (or EMPTY for create). */
function fromPlan(plan) {
  if (!plan) return EMPTY
  const days = plan.periodDays ?? 30
  const period = days === 30 ? 'monthly' : days === 365 ? 'yearly' : 'custom'
  return {
    name: plan.name ?? '',
    price: String(plan.price ?? ''),
    period,
    periodDays: String(days),
    description: plan.description ?? '',
    features: Array.isArray(plan.features) ? plan.features.map((value) => ({ id: uid(), value })) : [],
    active: plan.active ?? true,
  }
}

/**
 * Create/edit a subscription plan. `plan` null → create mode. Calls async
 * `onSubmit(planData)` and closes on success.
 */
export default function PlanFormModal({ open, plan, onClose, onSubmit }) {
  const { t } = useTranslation()
  const isEdit = Boolean(plan)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(fromPlan(plan))
      setError(null)
      setSubmitting(false)
    }
  }, [open, plan])

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setPeriod = (period) =>
    setForm((prev) => ({
      ...prev,
      period,
      periodDays: period === 'custom' ? prev.periodDays : String(PERIOD_DAYS[period]),
    }))

  const addFeature = () =>
    setForm((prev) => ({ ...prev, features: [...prev.features, { id: uid(), value: '' }] }))
  const updateFeature = (id, value) =>
    setForm((prev) => ({ ...prev, features: prev.features.map((f) => (f.id === id ? { ...f, value } : f)) }))
  const removeFeature = (id) =>
    setForm((prev) => ({ ...prev, features: prev.features.filter((f) => f.id !== id) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('plansPage.nameRequired'))
      return
    }
    const days = Number(form.periodDays)
    if (!Number.isInteger(days) || days < 1) {
      setError(t('plansPage.periodInvalid'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: form.name.trim(),
        price: Number(form.price) || 0,
        periodDays: days,
        description: form.description.trim(),
        features: form.features.map((f) => f.value.trim()).filter(Boolean),
        active: form.active,
      })
      onClose()
    } catch (err) {
      setError(translateApiError(err, t, 'plansPage.saveFailed'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('plansPage.editTitle') : t('plansPage.addTitle')}
      icon="star"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="plan-form" disabled={submitting}>
            {submitting ? t('common.saving') : isEdit ? t('common.saveShort') : t('plansPage.add')}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <FormField label={t('plansPage.name')} icon="star" required>
          <input type="text" value={form.name} onChange={update('name')} placeholder={t('plansPage.namePlaceholder')} className={controlClass()} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('plansPage.price')}>
            <input type="number" min="0" step="1" value={form.price} onChange={update('price')} placeholder="0" className={controlClass()} />
          </FormField>
          <FormField label={t('plansPage.period')}>
            <Select
              value={form.period}
              onChange={(v) => setPeriod(v)}
              options={[
                { value: 'monthly', label: t('plansPage.periods.monthly') },
                { value: 'yearly', label: t('plansPage.periods.yearly') },
                { value: 'custom', label: t('plansPage.periods.custom') },
              ]}
            />
          </FormField>
        </div>

        {form.period === 'custom' && (
          <FormField label={t('plansPage.periodDays')}>
            <input type="number" min="1" step="1" value={form.periodDays} onChange={update('periodDays')} placeholder="30" className={controlClass()} />
          </FormField>
        )}

        <FormField label={t('plansPage.description')}>
          <textarea rows={2} value={form.description} onChange={update('description')} placeholder={t('plansPage.descriptionPlaceholder')} className={`${controlClass()} resize-none`} />
        </FormField>

        {/* Features */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{t('plansPage.features')}</span>
            <Button type="button" size="sm" variant="secondary" icon="plus" onClick={addFeature}>{t('plansPage.addFeature')}</Button>
          </div>
          {form.features.length === 0 ? (
            <p className="text-xs text-slate-400">{t('plansPage.noFeatures')}</p>
          ) : (
            <div className="space-y-2">
              {form.features.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <input value={f.value} onChange={(e) => updateFeature(f.id, e.target.value)} placeholder={t('plansPage.featurePlaceholder')} className={controlClass()} />
                  <button type="button" onClick={() => removeFeature(f.id)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('common.delete')}>
                    <Icon name="trash" className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active */}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <div>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{t('plansPage.active')}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t('plansPage.activeHint')}</span>
          </div>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-700" />
        </label>
      </form>
    </Modal>
  )
}
