import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../components/ui/Icon'
import { ToastContext } from './ToastContext'

// Per-type look + glyph. `success` is the default (used after deletes/saves).
const TYPES = {
  success: {
    icon: 'check',
    className:
      'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300',
    iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  error: {
    icon: 'alert',
    className:
      'border-red-200 bg-white text-red-700 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300',
    iconWrap: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  },
  info: {
    icon: 'bell',
    className:
      'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200',
    iconWrap: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
  },
}

let seq = 0

/**
 * App-wide toast notifications. A toast is a small pill that slides in at the
 * top, auto-dismisses after a few seconds, and can be closed. Exposes
 * `showToast(message, { type, duration })` through context (see useToast).
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const showToast = useCallback(
    (message, opts = {}) => {
      const id = ++seq
      const type = TYPES[opts.type] ? opts.type : 'success'
      setToasts((list) => [...list, { id, message, type }])
      timers.current[id] = setTimeout(() => dismiss(id), opts.duration ?? 3000)
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => {
            const style = TYPES[toast.type]
            return (
              <div
                key={toast.id}
                role="status"
                className={`toast-pop pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur ${style.className}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}>
                  <Icon name={style.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="ms-1 shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
