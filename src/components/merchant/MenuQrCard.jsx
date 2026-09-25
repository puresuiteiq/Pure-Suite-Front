import { useMemo, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import Button from '../ui/Button'
import { storefrontUrl } from '../../config/site'
import { usePublicSiteUrl } from '../../hooks/usePublicSiteUrl'

const PREVIEW_SIZE = 192
const EXPORT_SIZE = 1024
const LOGO_SCALE = 0.18

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function drawLogoOnQr(sourceCanvas, logoSrc) {
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_SIZE
  canvas.height = EXPORT_SIZE
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sourceCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE)

  if (!logoSrc) return canvas

  try {
    const logo = await loadImage(logoSrc)
    const logoSize = Math.round(EXPORT_SIZE * LOGO_SCALE)
    const padding = Math.round(logoSize * 0.22)
    const boxSize = logoSize + padding * 2
    const boxX = Math.round((EXPORT_SIZE - boxSize) / 2)
    const boxY = Math.round((EXPORT_SIZE - boxSize) / 2)
    const logoX = Math.round((EXPORT_SIZE - logoSize) / 2)
    const logoY = Math.round((EXPORT_SIZE - logoSize) / 2)

    ctx.imageSmoothingEnabled = true
    roundedRect(ctx, boxX, boxY, boxSize, boxSize, Math.round(boxSize * 0.18))
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = Math.max(4, Math.round(EXPORT_SIZE * 0.008))
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
  } catch {
    // If a remote logo cannot be read by canvas, still download the sharp QR.
  }

  return canvas
}

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
  logoSrc = null,
}) {
  const qrRef = useRef(null)
  const siteUrl = usePublicSiteUrl()
  const menuUrl = useMemo(
    () => storefrontUrl(merchantId, baseUrl || siteUrl),
    [baseUrl, siteUrl, merchantId],
  )

  const downloadQrCode = async () => {
    const canvas = qrRef.current
    if (!canvas || !merchantId) return

    const exportCanvas = await drawLogoOnQr(canvas, logoSrc)
    const link = document.createElement('a')
    link.download = `storefront-qr-${merchantId}.png`
    link.href = exportCanvas.toDataURL('image/png')
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
          <div className="relative">
            <QRCodeCanvas
              ref={qrRef}
              value={menuUrl}
              size={PREVIEW_SIZE}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#0f172a"
              title={`QR code for ${merchantId}`}
            />
            {logoSrc && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-4 ring-white">
                  <img src={logoSrc} alt="" className="h-full w-full object-contain" crossOrigin="anonymous" />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
