import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import PageHeader from '../../components/ui/PageHeader'
import Icon from '../../components/ui/Icon'
import { useMerchantOrders } from '../../hooks/useMerchantOrders'
import { merchantOrdersService } from '../../services/merchantOrdersService'
import { translateApiError } from '../../utils/apiError'
import Button from '../../components/ui/Button'
import { formatAmount, currencySuffix } from '../../utils/format'
import { formatDateTime } from '../../utils/format'
import { methodLabelKey } from '../../config/serviceMethods'

/** Order number shown as a zero-padded reference, e.g. 9 → "0009". */
const orderRef = (n) => String(n ?? '').padStart(4, '0')

const METHOD_ICON = { delivery: 'send', dinein: 'store', pickup: 'cart' }
const ORDERS_PAGE_SIZE = 10

// A short "· zone" / "· table N" detail for the method chip.
function methodDetail(order, t) {
  if (order.serviceMethod === 'delivery' && order.deliveryZone) return ` · ${order.deliveryZone}`
  if (order.serviceMethod === 'dinein' && order.tableNumber)
    return ` · ${t('public.checkout.tableLabel', { n: order.tableNumber })}`
  return ''
}

const STATUS_STYLE = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

function printOrder(order, t) {
  const rows = order.items
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td class="num">${Number(item.quantity)}</td>
        <td class="num">${formatAmount(item.unitPrice)}</td>
      </tr>`)
    .join('')
  const service =
    order.serviceMethod
      ? `${t(methodLabelKey(order.serviceMethod))}${methodDetail(order, t)}`
      : ''
  const html = `<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t('merchantOrders.orderNumber', { number: orderRef(order.orderNo) }))}</title>
  <style>
    /* 80mm thermal roll. The page length is set by the script below from the
       receipt's measured height: "size: 80mm auto" is invalid CSS (size takes
       lengths only), so Chrome dropped the whole rule and printed on A4. */
    @page { size: 80mm 200mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { width: 80mm; padding: 4mm 4mm 6mm; color: #000; font-family: Arial, Tahoma, sans-serif; font-size: 12px; line-height: 1.4; }
    h1 { margin: 0 0 6px; text-align: center; font-size: 16px; }
    .muted { color: #444; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .sep { border-top: 1px dashed #000; margin: 7px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: start; border-bottom: 1px dashed #000; padding-bottom: 3px; }
    td { padding: 3px 0; vertical-align: top; }
    .num { text-align: end; white-space: nowrap; }
    .total { font-size: 15px; font-weight: 700; }
  </style>
  <style id="page-size"></style>
</head>
<body>
  <h1>${escapeHtml(t('merchantOrders.receiptTitle'))}</h1>
  <div class="row"><span>${escapeHtml(t('merchantOrders.order'))}</span><strong>#${escapeHtml(orderRef(order.orderNo))}</strong></div>
  <div class="row"><span>${escapeHtml(t('merchantOrders.date'))}</span><span>${escapeHtml(formatDateTime(order.createdAt))}</span></div>
  ${service ? `<div class="row"><span>${escapeHtml(t('merchantOrders.method'))}</span><span>${escapeHtml(service)}</span></div>` : ''}
  ${order.customerName ? `<div class="row"><span>${escapeHtml(t('merchantOrders.customer'))}</span><span>${escapeHtml(order.customerName)}</span></div>` : ''}
  ${order.customerPhone ? `<div class="row"><span>${escapeHtml(t('merchantOrders.phone'))}</span><span dir="ltr">${escapeHtml(order.customerPhone)}</span></div>` : ''}
  <div class="sep"></div>
  <table>
    <thead><tr><th>${escapeHtml(t('merchantOrders.item'))}</th><th class="num">${escapeHtml(t('merchantOrders.qty'))}</th><th class="num">${escapeHtml(t('merchantOrders.price'))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sep"></div>
  ${order.deliveryFee > 0 ? `<div class="row"><span>${escapeHtml(t('public.checkout.deliveryFee'))}</span><span>${formatAmount(order.deliveryFee)} ${escapeHtml(currencySuffix())}</span></div>` : ''}
  <div class="row total"><span>${escapeHtml(t('merchantOrders.total'))}</span><span>${formatAmount(order.total)} ${escapeHtml(currencySuffix())}</span></div>
  <div class="sep"></div>
  <p class="muted" style="text-align:center;margin:0">${escapeHtml(t('merchantOrders.receiptThanks'))}</p>
  <script>
    window.onload = () => {
      // The page is exactly as long as the receipt: 80mm wide, height measured
      // (CSS px → mm at 96dpi) plus a little slack so the last line never
      // spills onto a second page.
      const mm = Math.ceil((document.body.scrollHeight * 25.4) / 96) + 4
      document.getElementById('page-size').textContent = '@page { size: 80mm ' + mm + 'mm; margin: 0; }'
      window.print()
      setTimeout(() => window.close(), 250)
    }
  </script>
</body>
</html>`
  const win = window.open('', '_blank', 'width=420,height=680')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}

/**
 * The merchant's order history — every order a customer placed on their
 * storefront, newest first, as a receipt card (number, items, total, customer).
 */
export default function MerchantOrders() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const {
    data: orders,
    setData,
    loading,
    loadingMore,
    error,
    total,
    setTotal,
    hasMore,
    loadMore,
  } = useMerchantOrders({ pageSize: ORDERS_PAGE_SIZE })
  const loadMoreRef = useRef(null)
  // Which order is mid-update, so only its buttons disable. Mirrors the
  // pendingId pattern MerchantsPage uses for merchant status changes.
  const [pendingId, setPendingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: '320px 0px' },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, loadingMore])

  const changeStatus = async (orderId, status) => {
    setPendingId(orderId)
    setActionError(null)
    try {
      const updated = await merchantOrdersService.updateStatus(orderId, status)
      setData((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: updated.status } : order,
        ),
      )
    } catch (err) {
      setActionError(translateApiError(err, t))
    } finally {
      setPendingId(null)
    }
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm(t('merchantOrders.deleteConfirm'))) return
    setPendingId(orderId)
    setActionError(null)
    try {
      await merchantOrdersService.delete(orderId)
      setData((prev) => prev.filter((order) => order.id !== orderId))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      setActionError(translateApiError(err, t))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('merchantOrders.title')}
        subtitle={
          loading
            ? t('merchantOrders.loading')
            : t('merchantOrders.subtitle', { n: total || orders.length })
        }
      />

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
        >
          {actionError}
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('merchantOrders.loadFailed')}
        </div>
      )}

      {!error && loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('merchantOrders.loading')}
        </div>
      )}

      {!error && !loading && orders.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Icon name="cart" className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">{t('merchantOrders.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('merchantOrders.emptyHint')}</p>
        </div>
      )}

      {!error && !loading && orders.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {orders.map((order, i) => (
            <motion.article
              key={order.id}
              // Cards fade + slide up as they scroll into view (once), with a
              // small cascade — the same entrance the Profile Management boxes
              // use — plus a hover lift. Skipped entirely under reduced motion.
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 6) * 0.05 }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {t('merchantOrders.orderNumber', { number: orderRef(order.orderNo) })}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(order.createdAt)}</p>
                  {order.serviceMethod && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      <Icon name={METHOD_ICON[order.serviceMethod] ?? 'cart'} className="h-3 w-3" />
                      {t(methodLabelKey(order.serviceMethod))}
                      {methodDetail(order, t)}
                    </span>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status] ?? STATUS_STYLE.completed}`}>
                  {t(`merchantOrders.status.${order.status}`)}
                </span>
              </div>

              <ul className="divide-y divide-slate-100 px-5 dark:divide-white/10">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 text-slate-700 dark:text-slate-200">{item.productName}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {formatAmount(item.unitPrice)} × {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-100 px-5 py-3 dark:border-white/10">
                {order.deliveryFee > 0 && (
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{t('public.checkout.deliveryFee')}</span>
                    <span className="tabular-nums">
                      {formatAmount(order.deliveryFee)} {currencySuffix()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{t('merchantOrders.total')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatAmount(order.total)} {currencySuffix()}
                  </span>
                </div>
              </div>

              {(order.customerName || order.customerPhone) && (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5">
                  {order.customerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="user" className="h-3.5 w-3.5" />
                      {order.customerName}
                    </span>
                  )}
                  {order.customerPhone && (
                    <a href={`tel:${order.customerPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand-600" dir="ltr">
                      <Icon name="phone" className="h-3.5 w-3.5" />
                      {order.customerPhone}
                    </a>
                  )}
                </div>
              )}

              {/* Actions, as their own border-t region matching the card's
                  existing rhythm. Only shown while a move is actually possible:
                  a cancelled or failed order is terminal. */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/10">
                <Button
                  size="sm"
                  variant="secondary"
                  icon="download"
                  disabled={pendingId === order.id}
                  onClick={() => printOrder(order, t)}
                >
                  {t('merchantOrders.print')}
                </Button>
                {(order.status === 'pending' || order.status === 'completed') && (
                  <>
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        icon="check"
                        disabled={pendingId === order.id}
                        onClick={() => changeStatus(order.id, 'completed')}
                      >
                        {t('merchantOrders.markCompleted')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="ban"
                      disabled={pendingId === order.id}
                      onClick={() => changeStatus(order.id, 'cancelled')}
                    >
                      {t('merchantOrders.markCancelled')}
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  disabled={pendingId === order.id}
                  onClick={() => deleteOrder(order.id)}
                >
                  {t('merchantOrders.delete')}
                </Button>
              </div>
            </motion.article>
          ))}
          <div ref={loadMoreRef} className="h-8 lg:col-span-2" />
          {loadingMore && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              {t('merchantOrders.loadingMore')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
