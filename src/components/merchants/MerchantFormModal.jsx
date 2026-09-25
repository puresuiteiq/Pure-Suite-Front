import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import FormField from '../ui/FormField'
import Select from '../ui/Select'
import DatePicker from '../ui/DatePicker'
import { controlClass } from '../../utils/form'
import { slugify } from '../../utils/slug'
import { BUSINESS_CATEGORIES, isKnownCategory } from '../../config/businessCategories'
import { usePlans } from '../../hooks/usePlans'
import { merchantsService } from '../../services/merchantsService'
import { translateApiError } from '../../utils/apiError'

const FALLBACK_PLANS = ['Starter', 'Growth', 'Enterprise']
const FALLBACK_PLAN_DAYS = 30

const EMPTY = {
  name: '',
  slug: '',
  businessType: 'restaurant',
  owner: '',
  email: '',
  phone: '',
  plan: 'Starter',
  branches: 1,
  sourceMerchantId: '',
  copyMenu: false,
  subscriptionStartsAt: '',
  subscriptionExpiresAt: '',
}

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
 * Create-merchant modal. Calls `onSubmit(formData)` (async) which returns the
 * created merchant including a one-time `tempPassword`. On success it shows the
 * generated login credentials for the admin to share (the account is usable
 * immediately). Email is required — it's the merchant's login identifier.
 */
export default function MerchantFormModal({ open, onClose, onSubmit }) {
  const { t } = useTranslation()
  const { data: plans } = usePlans()
  // Active plan names, from the DB; fall back to the seeded three if unavailable.
  const planList = useMemo(() => {
    const planOptions = plans.filter((p) => p.active).map((p) => p.name)
    return planOptions.length ? planOptions : FALLBACK_PLANS
  }, [plans])
  const planByName = useMemo(() => new Map(plans.map((plan) => [plan.name, plan])), [plans])
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  // Until the admin edits the link themselves it tracks the business name;
  // after that it is theirs and typing the name no longer overwrites it.
  const [slugEdited, setSlugEdited] = useState(false)
  const [created, setCreated] = useState(null) // { name, email, tempPassword }

  // EMPTY.plan is 'Starter', which the admin may have renamed or deactivated —
  // in that case it is not in planList, so the select would show no match while
  // the form still submitted it, creating a merchant on a plan that no longer
  // exists. Fall back to the first option the user can actually see.
  const selectedPlan = planList.includes(form.plan) ? form.plan : (planList[0] ?? form.plan)

  // A suggestion only — the backend re-validates and resolves collisions.
  const effectiveSlug = slugEdited ? form.slug : slugify(form.name)
  const linkHost = typeof window === 'undefined' ? '' : window.location.host
  // Reset to a clean form each time the modal opens.
  useEffect(() => {
    if (open) {
      const initialPlan = planList.includes(EMPTY.plan) ? EMPTY.plan : (planList[0] ?? EMPTY.plan)
      setForm({
        ...EMPTY,
        plan: initialPlan,
        ...subscriptionDatesForPlan(planByName.get(initialPlan)?.periodDays ?? FALLBACK_PLAN_DAYS),
      })
      setErrors({})
      setSubmitError(null)
      setSubmitting(false)
      setCreated(null)
      setSlugEdited(false)
    }
  }, [open, planByName, planList])

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = t('merchantForm.nameRequired')
    if (!form.phone.trim()) next.phone = t('merchantForm.phoneRequired')
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
      // Empty slug → let the backend generate one from the name.
      const result = await onSubmit({
        ...form,
        plan: selectedPlan,
        slug: effectiveSlug || undefined,
        copyMenuFromMerchantId:
          form.copyMenu && form.sourceMerchantId ? Number(form.sourceMerchantId) : undefined,
      })
      if (result?.tempPassword) {
        setCreated(result) // show credentials instead of closing
      } else {
        onClose()
      }
    } catch (err) {
      setSubmitError(translateApiError(err, t, 'merchantForm.somethingWrong'))
    } finally {
      setSubmitting(false)
    }
  }

  // --- Credentials screen (after a successful create) ---
  if (created) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t('merchantForm.createdTitle')}
        subtitle={created.name}
        icon="check"
        footer={<Button onClick={onClose}>{t('common.done')}</Button>}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('merchantForm.createdIntro', { name: created.name })}
          </p>
          {/* Credentials grouped in one card. */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5">
            <CredentialRow
              label={t('merchantForm.credEmail')}
              value={created.email}
              icon="mail"
            />
            <CredentialRow
              label={t('merchantForm.credPassword')}
              value={created.tempPassword}
              icon="lock"
            />
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('merchantForm.copyNote')}</span>
          </div>
        </div>
      </Modal>
    )
  }

  // --- Create form ---
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('merchantForm.createTitle')}
      icon="store"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="merchant-form"
            icon="plus"
            disabled={submitting}
          >
            {submitting ? t('merchantForm.creating') : t('merchantForm.createBtn')}
          </Button>
        </>
      }
    >
      <form id="merchant-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            placeholder={t('merchantForm.businessNamePlaceholder')}
            aria-invalid={Boolean(errors.name)}
            className={controlClass(errors.name)}
          />
        </FormField>

        <FormField label={t('merchantForm.storefrontLink')} icon="book">
          <input
            type="text"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugEdited(true)
              setForm((prev) => ({ ...prev, slug: e.target.value }))
              setErrors((prev) => ({ ...prev, slug: undefined }))
            }}
            placeholder={t('merchantForm.storefrontLinkPlaceholder')}
            dir="ltr"
            className={`${controlClass(errors.slug)} text-start`}
          />
          {/* The exact address the customer will open, so the admin can see
              what they are choosing before creating the merchant. */}
          <p dir="ltr" className="mt-1.5 text-start text-xs text-slate-500 dark:text-slate-400">
            {linkHost}/r/{effectiveSlug || '…'}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {t('merchantForm.storefrontLinkHint')}
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
          <FormField
            label={t('merchantForm.ownerName')}
            error={errors.owner}
            icon="user"
          >
            <input
              type="text"
              value={form.owner}
              onChange={update('owner')}
              placeholder={t('merchantForm.ownerNamePlaceholder')}
              aria-invalid={Boolean(errors.owner)}
              className={controlClass(errors.owner)}
            />
          </FormField>

          <FormField
            label={t('merchantForm.phone')}
            error={errors.phone}
            icon="phone"
            required
          >
            <input
              type="tel"
              value={form.phone}
              onChange={update('phone')}
              placeholder={t('merchantForm.phonePlaceholder')}
              dir="ltr"
              aria-invalid={Boolean(errors.phone)}
              className={`${controlClass(errors.phone)} text-start`}
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
            placeholder={t('merchantForm.emailPlaceholder')}
            dir="ltr"
            aria-invalid={Boolean(errors.email)}
            className={`${controlClass(errors.email)} text-start`}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('merchantForm.plan')} icon="star">
            <Select
              value={selectedPlan}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  plan: v,
                  ...subscriptionDatesForPlan(planByName.get(v)?.periodDays ?? FALLBACK_PLAN_DAYS),
                }))
              }
              options={planList.map((plan) => ({
                value: plan,
                label: t(`plans.${plan}`, plan),
              }))}
            />
          </FormField>
        </div>

        <BranchSourceField
          selectedId={form.sourceMerchantId}
          copyMenu={form.copyMenu}
          onSelect={(merchant) =>
            setForm((prev) => ({
              ...prev,
              sourceMerchantId: merchant?.id ? String(merchant.id) : '',
              copyMenu: merchant ? prev.copyMenu : false,
            }))
          }
          onCopyMenuChange={(copyMenu) => setForm((prev) => ({ ...prev, copyMenu }))}
        />

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

function BranchSourceField({ selectedId, copyMenu, onSelect, onCopyMenuChange }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const selected = options.find((merchant) => String(merchant.id) === String(selectedId))

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      merchantsService
        .list({ limit: 10, offset: 0, q: query.trim() })
        .then((result) => {
          if (!active) return
          setOptions(result.items ?? [])
        })
        .catch(() => {
          if (active) setOptions([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/45 p-4 dark:border-white/10 dark:bg-slate-950/20">
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
          <Icon name="store" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('merchantForm.branchSource')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t('merchantForm.branchSourceHint')}
          </p>
        </div>
      </div>

      <div className="relative mt-3">
        <Icon
          name="search"
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('merchantForm.branchSearchPlaceholder')}
          className={`${controlClass()} ps-9`}
        />
      </div>

      <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-slate-200/70 bg-white/70 p-1.5 dark:border-white/10 dark:bg-slate-900/50">
        {loading && (
          <p className="px-3 py-2 text-sm text-slate-500">{t('merchantForm.branchSearching')}</p>
        )}
        {!loading && options.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">{t('merchantForm.branchNoResults')}</p>
        )}
        {!loading &&
          options.map((merchant) => {
            const isSelected = String(merchant.id) === String(selectedId)
            return (
              <button
                key={merchant.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : merchant)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                  isSelected
                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  #{merchant.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{merchant.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-400">
                    {merchant.owner || merchant.phone || merchant.email || t(`plans.${merchant.plan}`, merchant.plan)}
                  </span>
                </span>
                {isSelected && <Icon name="check" className="accent-text h-4 w-4 shrink-0" />}
              </button>
            )
          })}
      </div>

      {selectedId && (
        <label className="mt-3 flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-white/5">
          <input
            type="checkbox"
            checked={copyMenu}
            onChange={(event) => onCopyMenuChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="block font-semibold text-slate-800 dark:text-slate-100">
              {t('merchantForm.copyMenuFromBranch')}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {selected
                ? t('merchantForm.copyMenuFromBranchHint', { name: selected.name })
                : t('merchantForm.copyMenuFromBranchHintGeneric')}
            </span>
          </span>
        </label>
      )}
    </div>
  )
}

function CredentialRow({ label, value, icon }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable; the value is still visible to copy manually
    }
  }
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900">
        {icon && (
          <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        <code dir="ltr" className="flex-1 truncate text-start font-mono text-sm font-semibold tracking-wide text-slate-900 dark:text-white">{value}</code>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
            copied
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5'
          }`}
        >
          <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
    </div>
  )
}
