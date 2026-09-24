import { useMemo, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Button from '../ui/Button'
import { storefrontUrl } from '../../config/site'
import { usePublicSiteUrl } from '../../hooks/usePublicSiteUrl'

/**
 * A downloadable QR code for one merchant's public menu.
 *
 * `baseUrl` defaults to the deployment's own APP_URL rather than the host the
 * dashboard happens to be served from: the code is printed once and scanned for
 * months, so it must carry the domain the business owns even when the dashboard
 * was opened on a platform hostname or a preview URL.
 */
export default function MenuQrCard({
  merchantId,
  baseUrl,
  eyebrow = 'QR',
  title = 'QR code',
  description = 'Let customers scan this code to open your storefront.',
  downloadLabel = 'Download PNG',
}) {
  const qrRef = useRef(null)
  const siteUrl = usePublicSiteUrl()
  const menuUrl = useMemo(
    () => storefrontUrl(merchantId, baseUrl || siteUrl),
    [baseUrl, siteUrl, merchantId],
  )

  const downloadQrCode = () => {
    const canvas = qrRef.current
    if (!canvas || !merchantId) return

    const link = document.createElement('a')
    link.download = `storefront-qr-${merchantId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!menuUrl) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Neutral ink: in the brand colour, the default amber on white was
              2.15:1. The card's heading below carries the emphasis. */}
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-300">
            {description}
          </p>
          <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {menuUrl}
          </p>
          <Button className="mt-4" icon="download" onClick={downloadQrCode}>
            {downloadLabel}
          </Button>
        </div>

        <div className="self-center rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(37,99,235,0.16)] ring-1 ring-slate-100">
          <QRCodeCanvas
            ref={qrRef}
            value={menuUrl}
            size={192}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0f172a"
            title={`QR code for ${merchantId}`}
          />
        </div>
      </div>
    </section>
  )
}
