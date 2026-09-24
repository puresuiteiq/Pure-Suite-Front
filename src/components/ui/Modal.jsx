import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

// How long the exit animation runs — keep in sync with `.modal-panel--closing`.
const EXIT_MS = 200

/**
 * Panel widths. `md` is the default and matches what every modal used before
 * this prop existed, so sizing stays opt-in; `sm` is for short prompts, where
 * a wide panel leaves the content marooned in empty space.
 */
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Accessible modal dialog.
 * - Closes on Escape and backdrop click.
 * - Locks body scroll while open.
 * - Renders nothing when `open` is false.
 *
 * Portalled to <body> on purpose: `.page-enter > *` (index.css) animates with
 * fill-mode `both`, so its final transform sticks and the routed page becomes a
 * containing block for fixed descendants. Rendered in place, this panel's
 * `fixed inset-0` would resolve against the full-height page instead of the
 * viewport and centre itself far below the fold. The portal puts it outside any
 * transformed ancestor, so it stays viewport-centred no matter what wraps it.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  // Hide the title/close header bar entirely (for self-contained dialogs like
  // a centered confirmation that render their own heading + close affordance).
  hideHeader = false,
  // Inline style merged onto the panel, e.g. to swap the shared frosted-
  // white .luxury-modal background for a merchant-theme-tinted one on the
  // public storefront specifically (see utils/themedPanel.js) — Modal itself
  // stays theme-neutral since it's also used by the Super Admin and merchant
  // dashboards, which have no merchant theme to follow. Has to be a real
  // inline style, not a className: .luxury-modal's background is unlayered
  // plain CSS, which always outranks a same-specificity Tailwind utility
  // regardless of `!`/important prefixes (a cascade-layer quirk — a
  // className-based version of this prop silently lost to it in practice).
  panelStyle = undefined,
  // Extra class on the panel — unlike panelStyle above, this is NOT for the
  // background itself (still panelStyle's job). It's a scoping hook so index.css
  // can override .modal-header/.modal-footer's own opaque frosted fill for just
  // this panel (e.g. "storefront-modal": their fill would otherwise sit on top
  // of panelStyle's theme gradient and wash it back out). Safe as a plain
  // className here because it targets descendant plain-CSS rules, not a
  // same-element Tailwind utility, so the cascade-layer issue above doesn't apply.
  panelClassName = '',
}) {
  // `visible` keeps the panel mounted through its exit animation: when `open`
  // flips to false we play the closing animation, then unmount `EXIT_MS` later.
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
      return undefined
    }
    // Closing: animate out, then remove from the DOM.
    setClosing(true)
    const id = setTimeout(() => setVisible(false), EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!visible) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [visible, onClose])

  if (!visible) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop — fades out with the panel. */}
      <div
        className={`absolute inset-0 bg-slate-950/55 backdrop-blur-md transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`modal-panel luxury-modal relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl ${SIZES[size] ?? SIZES.md} ${closing ? 'modal-panel--closing' : ''} ${panelClassName}`}
        style={panelStyle}
      >
        {!hideHeader && (
        // px-4 below sm: on a 320–360px phone the panel is ~300px wide, and
        // 24px gutters on each side left too little for titles and buttons.
        <div className="modal-header flex items-center gap-3 px-4 py-4 sm:gap-3.5 sm:px-6">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
              <Icon name={icon} className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="modal-title"
              className="line-clamp-2 break-words text-lg font-semibold leading-snug tracking-tight text-slate-900"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-modal-close
            className="shrink-0 rounded-xl p-2 text-slate-400 transition-all hover:scale-105 hover:bg-red-50 hover:text-red-500 active:scale-95 dark:hover:bg-red-500/10"
            aria-label="Close dialog"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        )}

        <div className="overflow-y-auto px-4 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="modal-footer flex items-center justify-end gap-3 px-4 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
