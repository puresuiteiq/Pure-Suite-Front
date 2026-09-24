import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import PlanFormModal from '../components/admin/PlanFormModal'
import { usePlans } from '../hooks/usePlans'
import { plansService } from '../services/plansService'
import { translateApiError } from '../utils/apiError'
import { formatAmount, currencySuffix } from '../utils/format'

const periodLabelKey = (days) =>
  days === 30 ? 'plansPage.per.monthly' : days === 365 ? 'plansPage.per.yearly' : 'plansPage.per.customN'

// The three plans the DB is seeded with are stored in English. We translate them
// by name, but ONLY while they still match the original seed — so if the admin
// edits a plan (or creates their own), their exact text is shown untouched.
const DEFAULT_SEED = {
  Starter: {
    description: 'For a single small business getting started.',
    features: ['1 branch', 'Menu / catalog', 'WhatsApp orders'],
  },
  Growth: {
    description: 'For growing businesses that need more.',
    features: ['Up to 3 branches', 'Customer reviews', 'Priority support'],
  },
  Enterprise: {
    description: 'For established businesses at scale.',
    features: ['Unlimited branches', 'All features', 'Dedicated support'],
  },
}

/**
 * Super Admin subscription-plan builder. Plans live in the DB and feed the
 * merchant plan dropdown, the MRR KPI, and the Platform Revenue page.
 */
export default function SubscriptionPlans() {
  const { t } = useTranslation()
  const { data: plans, setData, loading, error } = usePlans()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Localized plan name / description / features for the seeded defaults, with a
  // fallback to the stored (admin-entered) text for edited or custom plans.
  const planLabel = (name) => t(`plans.${name}`, name)
  const planDescription = (plan) => {
    const seed = DEFAULT_SEED[plan.name]
    return seed && plan.description === seed.description
      ? t(`plansPage.defaults.${plan.name}.description`, { defaultValue: plan.description })
      : plan.description || ''
  }
  const planFeatures = (plan) => {
    const seed = DEFAULT_SEED[plan.name]
    if (seed && JSON.stringify(plan.features ?? []) === JSON.stringify(seed.features)) {
      const tr = t(`plansPage.defaults.${plan.name}.features`, { returnObjects: true, defaultValue: null })
      if (Array.isArray(tr)) return tr
    }
    return plan.features ?? []
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (plan) => {
    setEditing(plan)
    setFormOpen(true)
  }

  const handleSubmit = async (data) => {
    if (editing) {
      const updated = await plansService.update(editing.id, data)
      setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const created = await plansService.create(data)
      setData((prev) => [...prev, created])
    }
  }

  // The delete can legitimately be refused: the API returns 409 PLAN_IN_USE
  // while merchants are still assigned. Without the catch this rejected
  // silently — no message, dialog stuck open, buttons live again — which read
  // as the button simply not working.
  const confirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await plansService.remove(toDelete.id)
      setData((prev) => prev.filter((p) => p.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      setDeleteError(translateApiError(err, t))
      // Rethrow so ConfirmDialog skips its success toast — "Deleted
      // successfully" next to a failure message would be worse than silence.
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const openDelete = (plan) => {
    setDeleteError(null) // a stale message must not greet the next attempt
    setToDelete(plan)
  }

  return (
    <div>
      <PageHeader
        title={t('plansPage.title')}
        subtitle={t('plansPage.subtitle')}
        actions={<Button icon="plus" onClick={openCreate}>{t('plansPage.add')}</Button>}
      />

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('plansPage.loadFailed')}
        </div>
      )}

      {!error && loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('plansPage.loading')}
        </div>
      )}

      {!error && !loading && plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Icon name="star" className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">{t('plansPage.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('plansPage.emptyHint')}</p>
        </div>
      )}

      {!error && !loading && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`luxury-glass luxury-card rounded-3xl p-6 ${plan.active ? '' : 'opacity-70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{planLabel(plan.name)}</h2>
                    {!plan.active && (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {t('plansPage.inactive')}
                      </span>
                    )}
                  </div>
                  {planDescription(plan) && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{planDescription(plan)}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => openEdit(plan)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5" aria-label={t('common.edit')}>
                    <Icon name="pencil" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openDelete(plan)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={t('common.delete')}>
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatAmount(plan.price)}{' '}
                <span className="text-sm font-medium text-slate-400">
                  {currencySuffix()} / {t(periodLabelKey(plan.periodDays), { n: plan.periodDays })}
                </span>
              </p>

              {planFeatures(plan).length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {planFeatures(plan).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      <PlanFormModal open={formOpen} plan={editing} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('plansPage.deleteTitle')}
        message={t('plansPage.deleteConfirm', { name: toDelete?.name })}
        confirmLabel={t('common.delete')}
        loadingLabel={t('common.deleting')}
        destructive
        icon="trash"
        successMessage={t('common.deletedSuccess')}
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteError(null)
          setToDelete(null)
        }}
      />
    </div>
  )
}
