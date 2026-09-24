import { useMemo, useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { useBanners } from '../../hooks/useBanners'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Switch from '../../components/ui/Switch'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import BannerFormModal from '../../components/merchant/BannerFormModal'
import BannerArtwork from '../../components/public/BannerArtwork'
import { translateApiError } from '../../utils/apiError'

const CLOSED_CONFIRM = { open: false, banner: null, loading: false, error: null }

/**
 * The storefront's top banner: whether it shows at all, and the merchant's own
 * slides — add, edit, reorder, switch off, delete.
 *
 * With no slides the storefront keeps building the carousel from product
 * photos, so this page is optional for a merchant who never opens it.
 */
export default function BannersManagement() {
  const { t } = useVerticalT()
  const { profile, save } = useMerchantProfile()
  const {
    banners,
    linkTargets,
    available,
    max,
    loading,
    error: loadError,
    moving,
    addBanner,
    editBanner,
    removeBanner,
    moveBanner,
  } = useBanners()

  // `banner` is kept while closing, so the title doesn't flip mid-animation.
  const [modal, setModal] = useState({ open: false, banner: null })
  const [confirm, setConfirm] = useState(CLOSED_CONFIRM)
  // The row whose toggle/move is in flight; its controls wait for it.
  const [pendingId, setPendingId] = useState(null)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [error, setError] = useState(null)

  const showBanner = profile?.showBanner !== false
  const atLimit = banners.length >= max
  const canAdd = available && !loading && !atLimit

  const namesById = useMemo(() => {
    const product = new Map()
    const category = new Map()
    for (const entry of linkTargets) {
      category.set(entry.id, entry.name)
      for (const item of entry.items) product.set(item.id, item.name)
    }
    return { product, category }
  }, [linkTargets])

  const linkText = (banner) => {
    const name = namesById[banner.linkType]?.get(banner.linkId)
    if (!name) return t('banners.noLink')
    return banner.linkType === 'product'
      ? t('banners.opensProduct', { name })
      : t('banners.opensCategory', { name })
  }

  const openCreate = () => setModal({ open: true, banner: null })

  const submitBanner = (data) =>
    modal.banner ? editBanner(modal.banner.id, data) : addBanner(data)

  // One row action at a time per row, reported inline rather than as a toast.
  const runRowAction = async (bannerId, action) => {
    setPendingId(bannerId)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(translateApiError(err, t, 'banners.saveFailed'))
    } finally {
      setPendingId(null)
    }
  }

  const setVisibility = async (checked) => {
    setSavingVisibility(true)
    setError(null)
    try {
      await save({ showBanner: checked })
    } catch (err) {
      setError(translateApiError(err, t, 'banners.saveFailed'))
    } finally {
      setSavingVisibility(false)
    }
  }

  const runDelete = async () => {
    setConfirm((current) => ({ ...current, loading: true, error: null }))
    try {
      await removeBanner(confirm.banner.id)
      setConfirm(CLOSED_CONFIRM)
    } catch (err) {
      setConfirm((current) => ({ ...current, loading: false, error: translateApiError(err, t) }))
      throw err // skip ConfirmDialog's success toast
    }
  }

  return (
    <div>
      <PageHeader
        title={t('banners.title')}
        subtitle={t('banners.subtitle')}
        actions={
          <Button icon="plus" onClick={openCreate} disabled={!canAdd}>
            {t('banners.add')}
          </Button>
        }
      />

      {loadError && <Notice tone="error">{translateApiError(loadError, t, 'banners.loadFailed')}</Notice>}
      {!loading && !loadError && !available && <Notice tone="warning">{t('errors.BANNERS_UNAVAILABLE')}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="profile-glass p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('banners.showOnStorefront')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('banners.showOnStorefrontHint')}</p>
          </div>
          <Switch
            checked={showBanner}
            onChange={setVisibility}
            disabled={savingVisibility || !profile || !available}
            label={showBanner ? t('banners.shown') : t('banners.hidden')}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t('banners.listTitle')}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('banners.sizeHint')}</p>
          </div>
          {available && !loading && (
            <span
              dir="ltr"
              className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold tabular-nums text-slate-600 dark:border-white/10 dark:text-slate-300"
            >
              {t('banners.count', { n: banners.length, max })}
            </span>
          )}
        </div>

        {atLimit && available && (
          <Notice tone="warning">{t('errors.BANNER_LIMIT_REACHED', { max })}</Notice>
        )}

        {loading ? (
          <div className="profile-glass p-8 text-center text-sm text-slate-500">{t('banners.loading')}</div>
        ) : banners.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-white/15">
            <Icon name="image" className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{t('banners.emptyTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('banners.emptyHint')}</p>
            {available && !loadError && (
              <Button className="mt-5" icon="plus" onClick={openCreate}>
                {t('banners.add')}
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {banners.map((banner, index) => (
              <BannerRow
                key={banner.id}
                banner={banner}
                linkText={linkText(banner)}
                busy={pendingId === banner.id}
                moving={moving}
                first={index === 0}
                last={index === banners.length - 1}
                onToggle={(isActive) => runRowAction(banner.id, () => editBanner(banner.id, { isActive }))}
                onMove={(offset) => runRowAction(banner.id, () => moveBanner(banner.id, offset))}
                onEdit={() => setModal({ open: true, banner })}
                onDelete={() => setConfirm({ ...CLOSED_CONFIRM, open: true, banner })}
              />
            ))}
          </ul>
        )}
      </section>

      <BannerFormModal
        open={modal.open}
        banner={modal.banner}
        linkTargets={linkTargets}
        onClose={() => setModal((current) => ({ ...current, open: false }))}
        onSubmit={submitBanner}
      />

      <ConfirmDialog
        open={confirm.open}
        title={t('banners.deleteTitle')}
        message={t('banners.deleteConfirm')}
        confirmLabel={t('common.delete')}
        loadingLabel={t('common.deleting')}
        destructive
        loading={confirm.loading}
        error={confirm.error}
        onConfirm={runDelete}
        onCancel={() => setConfirm(CLOSED_CONFIRM)}
        successMessage={t('common.deletedSuccess')}
      />
    </div>
  )
}

// `moving`: a reorder is saving somewhere in the list, so every row's move
// buttons wait for it (see useBanners.moveBanner).
function BannerRow({ banner, linkText, busy, moving, first, last, onToggle, onMove, onEdit, onDelete }) {
  const { t } = useVerticalT()
  return (
    <li className="profile-glass flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="public-carousel relative aspect-[2/1] w-full shrink-0 overflow-hidden rounded-2xl sm:w-52">
        <BannerArtwork src={banner.image} title={banner.title} size="compact" />
        {!banner.isActive && (
          <span className="absolute start-2 top-2 rounded-full bg-slate-950/75 px-2 py-0.5 text-[11px] font-semibold text-white">
            {t('banners.hidden')}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm font-bold text-slate-900 dark:text-white">
          {banner.title || t('banners.untitled')}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Icon name={banner.linkType === 'none' ? 'ban' : 'send'} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{linkText}</span>
        </p>
        <Switch
          className="mt-3"
          checked={banner.isActive}
          onChange={onToggle}
          disabled={busy}
          label={banner.isActive ? t('banners.shown') : t('banners.hidden')}
        />
      </div>

      <div className="flex items-center gap-1 self-end sm:self-center">
        <IconButton icon="chevronDown" flip label={t('banners.moveUp')} onClick={() => onMove(-1)} disabled={busy || moving || first} />
        <IconButton icon="chevronDown" label={t('banners.moveDown')} onClick={() => onMove(1)} disabled={busy || moving || last} />
        <IconButton icon="pencil" label={t('common.edit')} onClick={onEdit} disabled={busy} />
        <IconButton icon="trash" danger label={t('common.delete')} onClick={onDelete} disabled={busy} />
      </div>
    </li>
  )
}

function IconButton({ icon, label, onClick, disabled, danger = false, flip = false }) {
  const tone = danger
    ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400'
    : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 ${tone}`}
    >
      <Icon name={icon} className={`h-5 w-5 ${flip ? 'rotate-180' : ''}`} />
    </button>
  )
}

const NOTICE_TONES = {
  error: 'border-red-400/20 bg-red-400/10 text-red-600 dark:text-red-300',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200',
}

function Notice({ tone, children }) {
  return (
    <p role={tone === 'error' ? 'alert' : undefined} className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${NOTICE_TONES[tone]}`}>
      {children}
    </p>
  )
}
