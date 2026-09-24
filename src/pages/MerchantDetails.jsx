import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import RenewSubscriptionModal from '../components/merchants/RenewSubscriptionModal'
import { merchantsService } from '../services/merchantsService'
import { useAuth } from '../hooks/useAuth'
import { usePlans } from '../hooks/usePlans'
import { formatCurrency } from '../utils/format'
import { modeForBusinessType, businessTypeLabel } from '../config/businessCategories'
import { translateApiError } from '../utils/apiError'

/** The app's card surface — same treatment as StatCard and the dashboards. */
const CARD = 'luxury-glass luxury-card rounded-3xl p-6'

export default function MerchantDetails() {
  const { t } = useTranslation()
  const { merchantId } = useParams()
  const navigate = useNavigate()
  // Adopt a merchant session without touching the admin one — see manageAccount.
  const { adoptSession: adoptMerchant } = useAuth()
  const { data: plans } = usePlans()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    merchantsService
      .get(merchantId)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [merchantId])

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  // Open the merchant's account: get a merchant session for them (the admin
  // session stays), then enter the real merchant panel to manage everything.
  const manageAccount = async () => {
    setOpening(true)
    setError(null)
    try {
      const session = await merchantsService.impersonate(merchantId)
      adoptMerchant({ ...session, impersonated: true })
      navigate('/merchant')
    } catch (err) {
      setError(err)
      setOpening(false)
    }
  }

  const renew = async (date) => {
    const { subscriptionExpiresAt } = await merchantsService.renew(merchantId, date)
    setData((prev) => ({ ...prev, merchant: { ...prev.merchant, subscriptionExpiresAt } }))
  }

  const cancelSubscription = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      const { subscriptionExpiresAt } = await merchantsService.cancelSubscription(merchantId)
      setData((prev) => ({ ...prev, merchant: { ...prev.merchant, subscriptionExpiresAt } }))
      setCancelOpen(false)
    } catch (err) {
      // Genuinely refusable: the API returns 409 when subscription tracking
      // has not been migrated in.
      setCancelError(translateApiError(err, t))
      throw err
    } finally {
      setCancelling(false)
    }
  }

  const resetPassword = async () => {
    setResetting(true)
    setError(null)
    try {
      setCredentials(await merchantsService.resetPassword(merchantId))
    } catch (err) {
      setError(err)
    } finally {
      setResetting(false)
      setConfirmOpen(false)
    }
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(credentials.tempPassword)
      setCopied(true)
    } catch {
      // Clipboard access can be denied or unavailable on an insecure origin.
      // The password stays on screen and selectable either way.
    }
  }

  if (loading) return <p className="text-sm text-slate-500">{t('merchantDetails.loading')}</p>
  if (error && !data)
    return <p className="text-sm text-red-600">{translateApiError(error, t)}</p>

  const { merchant, categories } = data
  const productCount = categories.reduce((count, category) => count + category.items.length, 0)

  // Suggested date the renew calendar picker opens on: the plan's billing
  // period from whichever is later, today or the current expiry — same rule
  // the one-click Renew used to apply automatically, now just a starting point.
  const periodDays = plans.find((p) => p.name === merchant.plan)?.periodDays || 30
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentExpiry = merchant.subscriptionExpiresAt
    ? new Date(`${merchant.subscriptionExpiresAt}T00:00:00`)
    : null
  // Cancel only makes sense while there's an actual live subscription to end.
  const hasLiveSubscription = Boolean(currentExpiry) && currentExpiry >= today
  // `new Date(...)` clones instead of reusing currentExpiry/today directly —
  // setDate() below mutates in place, and those two are read again elsewhere.
  const renewBase = new Date(currentExpiry && currentExpiry > today ? currentExpiry : today)
  renewBase.setDate(renewBase.getDate() + periodDays)
  const suggestedExpiry = renewBase.toISOString().slice(0, 10)

  // This is Super Admin (outside the merchant's VerticalContext), but the record
  // carries its category — derive the behaviour mode and inject it manually so
  // headings read per vertical.
  const vertical = modeForBusinessType(merchant.businessType)
  const vt = (key, opts) => t(key, { context: vertical, ...opts })

  return (
    <div>
      <PageHeader
        title={merchant.name}
        subtitle={t('merchantDetails.summary', { categories: categories.length, products: productCount })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon="store"
              onClick={manageAccount}
              disabled={opening || merchant.status === 'suspended'}
              title={merchant.status === 'suspended' ? t('merchantDetails.manageSuspended') : undefined}
            >
              {opening ? t('common.working') : t('merchantDetails.manageAccount')}
            </Button>
          </div>
        }
      />

      {/* grid-cols-1, not an implicit column: an implicit track is at least as
          wide as its longest unbreakable content, so one long product name
          (truncated, but still measured in full) pushed the whole page ~300px
          past a phone's edge. minmax(0, 1fr) lets the column shrink to fit. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {/* Sticky: the menu beside this can run for pages, and the account
              details are the reference you read it against. */}
          <section className={`${CARD} lg:sticky lg:top-24`}>
            <div className="flex items-center gap-3">
              {merchant.logo ? (
                <img src={merchant.logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                  <Icon name="image" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {t('merchantDetails.account')}
                </h2>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    merchant.isOpen
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {merchant.isOpen ? t('merchantDetails.open') : t('merchantDetails.closed')}
                </span>
              </div>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <Info label={t('merchantDetails.owner')} value={merchant.owner || '—'} />
              <Info label={t('merchantDetails.email')} value={merchant.email} />
              <Info label={t('merchantDetails.phone')} value={merchant.phone || '—'} />
              <Info label={t('merchantDetails.businessType')} value={businessTypeLabel(merchant.businessType, t)} />
              <Info label={t('merchantDetails.plan')} value={t(`plans.${merchant.plan}`, merchant.plan)} />
              <Info label={t('merchantDetails.address')} value={merchant.address || '—'} />
            </dl>

            {/* Subscription start/expiry + renew. */}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <div>
                    <dt className="whitespace-nowrap text-xs font-medium text-slate-500">{t('merchantDetails.subscriptionStarts')}</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                      {merchant.subscriptionStartsAt || t('merchantDetails.noExpiry')}
                    </dd>
                  </div>
                  <div>
                    <dt className="whitespace-nowrap text-xs font-medium text-slate-500">{t('merchantDetails.subscriptionEnds')}</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                      {merchant.subscriptionExpiresAt || t('merchantDetails.noExpiry')}
                    </dd>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" icon="check" onClick={() => setRenewOpen(true)}>
                    {t('merchantDetails.renew')}
                  </Button>
                  {hasLiveSubscription && (
                    <Button variant="secondary" size="sm" icon="close" onClick={() => (setCancelError(null), setCancelOpen(true))}>
                      {t('merchantDetails.cancelSubscription')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-xs leading-5 text-slate-500">
                {t('merchantDetails.passwordHint')}
              </p>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                icon="lock"
                onClick={() => setConfirmOpen(true)}
                disabled={resetting}
              >
                {resetting
                  ? t('merchantDetails.creatingPassword')
                  : t('merchantDetails.resetPassword')}
              </Button>

              {/* A reset that fails after the page has loaded had nowhere to
                  report itself — the early return above only covers a failed
                  initial load. */}
              {error && (
                <p className="mt-3 text-xs text-red-600">{translateApiError(error, t)}</p>
              )}

              {credentials && (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {t('merchantDetails.newCredentials')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300/80">
                    {t('merchantDetails.copyNote')}
                  </p>

                  <dl className="mt-3 space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">
                        {t('merchantDetails.email')}
                      </dt>
                      <dd className="mt-0.5 break-all text-sm text-slate-900 dark:text-white">
                        {credentials.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">
                        {t('merchantDetails.password')}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-900/5 px-2.5 py-1.5 font-mono text-sm text-slate-900 dark:bg-white/10 dark:text-white">
                          {credentials.tempPassword}
                        </code>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={copied ? 'check' : 'copy'}
                          onClick={copyPassword}
                        >
                          {copied ? t('common.copied') : t('common.copy')}
                        </Button>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <section className={CARD}>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {vt('merchantDetails.restaurantInfo')}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
              {merchant.description || t('merchantDetails.noDescription')}
            </p>
          </section>

          {categories.length === 0 ? (
            <div className={`${CARD} text-center text-sm text-slate-500`}>
              {t('merchantDetails.noProducts')}
            </div>
          ) : (
            categories.map((category) => (
              <section key={category.id} className={CARD}>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {category.name}
                </h2>
                <div className="mt-4 space-y-3">
                  {category.items.map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-3 rounded-2xl border border-slate-200 p-3 transition-colors hover:border-slate-300 sm:gap-4 dark:hover:border-white/20"
                    >
                      {item.image ? (
                        <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 sm:h-20 sm:w-20 dark:bg-white/5">
                          <Icon name="image" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {/* Price under the name on phones, where beside it
                            the name was cut to a few letters. */}
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                          <h3 className="line-clamp-2 break-words font-medium text-slate-900 dark:text-white">
                            {item.name}
                          </h3>
                          <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-brand-700">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        {/* Clamped: these run to a paragraph each, and at full
                            length the rows lost any shared rhythm. */}
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('merchantDetails.resetPassword')}
        message={t('merchantDetails.resetConfirm')}
        confirmLabel={t('merchantDetails.resetPassword')}
        destructive
        icon="lock"
        loading={resetting}
        onConfirm={resetPassword}
        onCancel={() => setConfirmOpen(false)}
      />

      <RenewSubscriptionModal
        open={renewOpen}
        merchant={merchant}
        defaultDate={suggestedExpiry}
        onClose={() => setRenewOpen(false)}
        onSubmit={renew}
      />

      <ConfirmDialog
        open={cancelOpen}
        title={t('merchantDetails.cancelConfirmTitle')}
        message={t('merchantDetails.cancelConfirmMessage', { name: merchant.name })}
        confirmLabel={t('merchantDetails.cancelSubscription')}
        loadingLabel={t('common.working')}
        destructive
        icon="close"
        loading={cancelling}
        error={cancelError}
        onConfirm={cancelSubscription}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-900 dark:text-white">{value}</dd>
    </div>
  )
}
