import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useClickOutside } from '../../hooks/useClickOutside'
import { notificationsService } from '../../services/notificationsService'

// Notification id prefixes (order-12, review-5, merchant-3, subexpiry-7) pick a
// coloured type icon so each kind is recognisable at a glance.
const TYPE_STYLE = {
  order: { icon: 'cart', className: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' },
  review: { icon: 'star', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  merchant: { icon: 'store', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  subexpiry: { icon: 'clock', className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
}
const typeStyle = (id) => TYPE_STYLE[String(id ?? '').split('-')[0]] ?? TYPE_STYLE.order

/**
 * Bell button with a dropdown of notifications fetched from the API.
 * Loads once on mount so the unread badge is accurate before opening.
 *
 * `service` supplies the feed — the admin `notificationsService` by default, or
 * the merchant `merchantNotificationsService` on the merchant side. Both expose
 * `listNotifications()` / `markRead(id)` / `remove(id)`.
 */
export default function NotificationsMenu({ service = notificationsService }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const ref = useRef(null)
  const { t } = useTranslation()
  useClickOutside(ref, () => setOpen(false), open)

  useEffect(() => {
    let active = true
    service
      .listNotifications()
      .then((data) => active && setItems(data))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [service])

  const unreadCount = items.filter((n) => n.unread).length

  const openNotification = async (notification) => {
    setSelected(notification)
    if (!notification.unread) return
    setItems((current) => current.map((item) => (item.id === notification.id ? { ...item, unread: false } : item)))
    try { await service.markRead(notification.id) } catch { /* local read state is harmless */ }
  }

  const removeNotification = async (id) => {
    setItems((current) => current.filter((item) => item.id !== id))
    if (selected?.id === id) setSelected(null)
    // The panel renders a single translated failure message, so only the fact
    // of the error matters here — the string was never displayed.
    try { await service.remove(id) } catch (err) { setError(err) }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-slate-200/70 bg-white/60 p-2 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-200"
        aria-label={t('topbar.notifications')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          // Phones: pinned to the viewport just under the topbar so a panel this
          // wide can't run off the screen edge (it's anchored to a bell that sits
          // near the right). From sm up it goes back to an anchored dropdown.
          className="fixed inset-x-3 top-[4.75rem] z-30 origin-top overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl motion-safe:animate-[menu-pop_160ms_cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-slate-900/95 sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 sm:w-[34rem]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('topbar.notifications')}
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                {t('topbar.notificationsNew', { count: unreadCount })}
              </span>
            )}
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2 sm:max-h-[28rem]">
            {loading && (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                {t('topbar.notificationsLoading')}
              </p>
            )}
            {error && (
              <p className="px-4 py-10 text-center text-sm text-red-600">
                {t('topbar.notificationsFailed')}
              </p>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
                  <Icon name="check" className="h-6 w-6" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('topbar.notificationsEmpty')}
                </p>
              </div>
            )}
            {!loading &&
              !error &&
              items.map((n) => {
                const style = typeStyle(n.id)
                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.10)] ${
                      n.unread
                        ? 'border-brand-200/60 bg-brand-50/50 dark:border-brand-500/20 dark:bg-brand-500/[0.07]'
                        : 'border-slate-200/60 bg-white/50 hover:border-slate-200 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-start"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.className}`}>
                        <Icon name={style.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {n.title}
                          </span>
                          {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500 dark:text-slate-400">
                          {n.message}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">{n.time}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNotification(n.id)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label={t('topbar.notificationsDelete')}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="sm"
        hideHeader
        footer={
          <div className="flex w-full items-stretch gap-3">
            <Button
              variant="secondary"
              className="min-w-0 flex-1"
              onClick={() => setSelected(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              icon="trash"
              className="min-w-0 flex-1"
              onClick={() => selected && removeNotification(selected.id)}
            >
              {t('common.remove')}
            </Button>
          </div>
        }
      >
        {/* Centered layout: the type icon (haloed) states what happened, then
            the title, the message, and when it happened. */}
        <div className="pt-1 text-center">
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-8 ring-slate-50 dark:ring-white/[0.03] ${typeStyle(selected?.id).className}`}
          >
            <Icon name={typeStyle(selected?.id).icon} className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {selected?.title}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
            {selected?.message}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {selected?.time}
          </span>
        </div>
      </Modal>
    </div>
  )
}
