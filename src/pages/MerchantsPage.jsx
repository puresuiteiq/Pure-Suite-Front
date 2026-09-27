import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import MerchantFormModal from '../components/merchants/MerchantFormModal'
import MerchantEditModal from '../components/merchants/MerchantEditModal'
import { useMerchants } from '../hooks/useMerchants'
import { merchantsService } from '../services/merchantsService'
import { businessTypeLabel } from '../config/businessCategories'
import { useAdminAuth } from '../hooks/useAdminAuth'
import { translateApiError } from '../utils/apiError'

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  trial: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
}

const MERCHANT_PAGE_SIZE = 10
const MERCHANT_PREFETCH_PX = 3200

function StatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      {t(`merchants.status.${status}`)}
    </span>
  )
}

export default function MerchantsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '')
  const createdBy = searchParams.get('createdBy') ?? ''
  const {
    data: merchants,
    setData: setMerchants,
    loading,
    loadingMore,
    error,
    total,
    hasMore,
    loadMore,
  } = useMerchants({ pageSize: MERCHANT_PAGE_SIZE, query: debouncedSearch, createdBy })
  const { t } = useTranslation()
  const loadMoreRef = useRef(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [toEdit, setToEdit] = useState(null) // merchant being edited
  const [pendingId, setPendingId] = useState(null) // row with an in-flight action
  // A sub-admin sees only the merchants they added (the API scopes the list)
  // and may not suspend or delete them; the main admin also sees who added each.
  const { isSuperAdmin } = useAdminAuth()
  const [toDelete, setToDelete] = useState(null) // merchant pending delete confirm
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setSearch((current) => (current === q ? current : q))
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = search.trim()
      setDebouncedSearch(q)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (q) next.set('q', q)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, setSearchParams])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasMore) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { rootMargin: `${MERCHANT_PREFETCH_PX}px 0px` },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return undefined
    let frame = 0
    const checkDistance = () => {
      frame = 0
      const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      if (remaining < MERCHANT_PREFETCH_PX) loadMore()
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(checkDistance)
    }
    checkDistance()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [hasMore, loadMore, loading, loadingMore])

  const handleCreate = async (form) => {
    const created = await merchantsService.create(form)
    // Keep the one-time tempPassword out of the persisted list; return the full
    // object so the modal can display the generated credentials.
    const merchant = { ...created }
    delete merchant.tempPassword
    setMerchants((prev) => [merchant, ...prev])
    return created
  }

  const handleEdit = async (data) => {
    const updated = await merchantsService.update(toEdit.id, data)
    setMerchants((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  const handleSetStatus = async (id, status) => {
    setPendingId(id)
    try {
      const updated = await merchantsService.setStatus(id, status)
      setMerchants((prev) => prev.map((m) => (m.id === id ? updated : m)))
    } finally {
      setPendingId(null)
    }
  }

  const confirmDelete = async () => {
    setDeleteError(null)
    if (!toDelete) return
    setDeleting(true)
    try {
      await merchantsService.remove(toDelete.id)
      setMerchants((prev) => prev.filter((m) => m.id !== toDelete.id))
      setToDelete(null)
    } catch (err) {
      // Without this the dialog sat open with no message and live buttons —
      // indistinguishable from a button that does nothing.
      setDeleteError(translateApiError(err, t))
      throw err // skip ConfirmDialog's success toast
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('merchants.title')}
        subtitle={
          loading
            ? t('merchants.subtitleLoading')
            : t('merchants.subtitle', { count: total ?? merchants.length })
        }
        actions={
          <Button icon="plus" onClick={() => setCreateOpen(true)}>
            {t('merchants.createNew')}
          </Button>
        }
      />

      {loadingMore && merchants.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-xl shadow-slate-900/15 backdrop-blur dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100">
          <span
            aria-label={t('common.loading')}
            role="status"
            className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
          />
          {t('common.loading')}
        </div>
      )}

      <div className="mb-5">
        <label className="relative block max-w-xl">
          <Icon
            name="search"
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('topbar.searchPlaceholder')}
            className="w-full rounded-2xl border border-slate-200/70 bg-white/75 py-3 ps-10 pe-10 text-sm text-slate-800 shadow-sm outline-none backdrop-blur transition-all placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-slate-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100"
              aria-label={t('common.clear')}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {createdBy && isSuperAdmin && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
          <span className="font-medium">{t('merchants.filteredBySupervisor')}</span>
          <Button
            size="sm"
            variant="secondary"
            icon="close"
            onClick={() =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.delete('createdBy')
                return next
              })
            }
          >
            {t('common.clear')}
          </Button>
        </div>
      )}

      <div>
        {loading && (
          <div className="p-8 text-center text-sm text-slate-500">
            {t('merchants.subtitleLoading')}
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-sm text-red-600">
            {t('merchants.loadFailed')}
          </div>
        )}

        {!loading && !error && merchants.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              {t('merchants.empty')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t('merchants.emptyHint')}
            </p>
          </div>
        )}

        {/* Phone: each merchant as a self-contained elevated card. */}
        {!loading && !error && merchants.length > 0 && (
          <ul className="space-y-3 lg:hidden">
            {merchants.map((m) => {
              const busy = pendingId === m.id
              const isActive = m.status === 'active'
              const iconBtn =
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-slate-500 shadow-[0_4px_14px_rgba(15,23,42,0.06)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              return (
                <li key={m.id} className="luxury-glass luxury-card overflow-hidden">
                  <div className="p-4">
                    {/* Header: logo, name, status, meta chips. */}
                    <div className="flex items-start gap-3">
                      {m.logo ? (
                        <img src={m.logo} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                          <Icon name="store" className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-slate-900 dark:text-white">{m.name}</h3>
                        {/* All the small chips together on one wrapping row. */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                          <StatusBadge status={m.status} />
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {businessTypeLabel(m.businessType, t)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">#{m.id}</span>
                          <span className={`inline-flex items-center gap-1 font-medium ${m.isOpen ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${m.isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            {m.isOpen ? t('merchants.availability.open') : t('merchants.availability.closed')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details panel. */}
                    <dl className="mt-3 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 text-sm dark:divide-white/5 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-slate-500 dark:text-slate-400">{t('merchants.cols.owner')}</dt>
                        <dd className="truncate font-medium text-slate-700 dark:text-slate-200">{m.owner || '—'}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-slate-500 dark:text-slate-400">{t('merchants.cols.phone')}</dt>
                        {/* dir="ltr" on the inner span only (not this dd) —
                            it fixes the phone digits' left-to-right order
                            without also flipping the dd's own text-align
                            default away from the row's RTL alignment. */}
                        <dd className="font-medium text-slate-700 dark:text-slate-200">
                          <span dir="ltr">{m.phone || '—'}</span>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-slate-500 dark:text-slate-400">{t('merchants.cols.plan')}</dt>
                        <dd className="font-medium text-slate-700 dark:text-slate-200">{t(`plans.${m.plan}`)}</dd>
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center justify-between gap-3 py-2">
                          <dt className="text-slate-500 dark:text-slate-400">{t('merchants.addedBy')}</dt>
                          <dd className="truncate font-medium text-slate-700 dark:text-slate-200">
                            <CreatedBy merchant={m} />
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Action bar: View details prominent + icon actions. */}
                  <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-3 dark:border-white/10">
                    <Link
                      to={`/merchants/${m.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/30 dark:from-white dark:to-slate-200 dark:text-slate-900"
                    >
                      {/* The icon gives way first on a 320px phone, where it
                          pushed "View details" onto two lines. */}
                      <Icon name="user" className="hidden h-4 w-4 shrink-0 min-[360px]:block" />
                      {t('merchants.actions.viewDetails')}
                    </Link>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSetStatus(m.id, isActive ? 'suspended' : 'active')}
                        disabled={busy}
                        className={iconBtn}
                        aria-label={isActive ? t('merchants.actions.deactivate') : t('merchants.actions.activate')}
                        title={isActive ? t('merchants.actions.deactivate') : t('merchants.actions.activate')}
                      >
                        <Icon name={isActive ? 'ban' : 'check'} className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setToEdit(m)}
                      disabled={busy}
                      className={iconBtn}
                      aria-label={t('merchants.actions.edit')}
                      title={t('merchants.actions.edit')}
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => (setDeleteError(null), setToDelete(m))}
                        disabled={busy}
                        className={`${iconBtn} hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400`}
                        aria-label={t('merchants.actions.delete')}
                        title={t('merchants.actions.delete')}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && !error && merchants.length > 0 && (
          <div className="hidden overflow-x-auto lg:block">
            {/* One shared grid for the header AND every row (not one grid per
                row) — each is `grid-cols-subgrid` so all six columns are
                sized ONCE, from every row's actual content together. A
                separate grid per row (the previous approach) breaks
                alignment: the last column is content-width (`auto`) to fit
                the action buttons, but the header's own "auto" cell only
                ever holds the word "Actions" — two different widths for the
                same named column, so every column before it lands at a
                different x position in the header vs. the rows, and the gap
                compounds column by column (exactly the growing left-drift in
                the reported screenshots). Subgrid computes the tracks once
                across the whole table, so this holds for any label length,
                including translated ones — see .col-span-full below. */}
            <div className="grid min-w-[68rem] grid-cols-[2.6fr_1.1fr_1.2fr_0.8fr_0.8fr_auto] gap-x-4 gap-y-2.5">
              {/* Column labels. */}
              <div className="col-span-full grid grid-cols-subgrid items-center px-6 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>{t('merchants.cols.restaurant')}</span>
                <span>{t('merchants.cols.owner')}</span>
                <span>{t('merchants.cols.phone')}</span>
                <span>{t('merchants.cols.plan')}</span>
                <span>{t('merchants.cols.status')}</span>
                <span className="text-end">{t('merchants.cols.actions')}</span>
              </div>

              {/* Each merchant as a luxury card row. */}
              {merchants.map((m) => {
                  const busy = pendingId === m.id
                  const isActive = m.status === 'active'
                  return (
                    <div
                      key={m.id}
                      className="luxury-glass luxury-card col-span-full grid grid-cols-subgrid items-center px-6 py-4 text-sm"
                    >
                      {/* Restaurant */}
                      <div className="flex min-w-0 items-center gap-3">
                        {m.logo ? (
                          <img src={m.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                            <Icon name="store" className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-slate-900 dark:text-white">{m.name}</span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              {businessTypeLabel(m.businessType, t)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>#{m.id}</span>
                            {isSuperAdmin && (
                              <span className="truncate">
                                · {t('merchants.addedBy')}: <CreatedBy merchant={m} />
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 font-medium ${m.isOpen ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${m.isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {m.isOpen ? t('merchants.availability.open') : t('merchants.availability.closed')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Owner */}
                      <div className="truncate text-slate-600 dark:text-slate-300">{m.owner || '—'}</div>
                      {/* Phone. dir="ltr" on the inner span only, not this
                          cell — this cell is a subgrid column shared with the
                          header, so overriding *its own* direction would also
                          flip its text-align default away from the header's
                          and every other cell's, pulling the number visually
                          out of the Phone column in RTL languages. */}
                      <div className="-ml-6 truncate text-slate-600 dark:text-slate-300">
                        <span dir="ltr">{m.phone || '—'}</span>
                      </div>
                      {/* Plan */}
                      <div className="text-slate-600 dark:text-slate-300">{t(`plans.${m.plan}`)}</div>
                      {/* Status */}
                      <div><StatusBadge status={m.status} /></div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/merchants/${m.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          {t('merchants.actions.viewDetails')}
                        </Link>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={isActive ? 'ban' : 'check'}
                            disabled={busy}
                            onClick={() => handleSetStatus(m.id, isActive ? 'suspended' : 'active')}
                          >
                            {isActive ? t('merchants.actions.deactivate') : t('merchants.actions.activate')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="pencil"
                          aria-label={t('merchants.actions.edit')}
                          title={t('merchants.actions.edit')}
                          disabled={busy}
                          onClick={() => setToEdit(m)}
                        />
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="danger"
                            icon="trash"
                            aria-label={t('merchants.actions.delete')}
                            title={t('merchants.actions.delete')}
                            disabled={busy}
                            onClick={() => (setDeleteError(null), setToDelete(m))}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {!loading && !error && merchants.length > 0 && (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            {loadingMore && (
              <span
                aria-label="Loading more"
                role="status"
                className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
              />
            )}
          </div>
        )}
      </div>

      {/* Create merchant */}
      <MerchantFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit merchant */}
      <MerchantEditModal
        open={Boolean(toEdit)}
        merchant={toEdit}
        onClose={() => setToEdit(null)}
        onSubmit={handleEdit}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('merchants.deleteTitle')}
        message={t('merchants.deleteConfirm', { name: toDelete?.name })}
        confirmLabel={t('common.delete')}
        loadingLabel={t('merchants.deleting')}
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

/** Who added a merchant, for the main admin's list. */
function CreatedBy({ merchant }) {
  const { t } = useTranslation()
  if (!merchant.createdBy) return <span>{t('merchants.addedByUnknown')}</span>
  return <bdi className="font-semibold">{merchant.createdBy.name || t('merchants.addedByDeleted')}</bdi>
}
