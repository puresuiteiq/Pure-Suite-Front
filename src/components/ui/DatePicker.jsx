import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import { controlClass } from '../../utils/form'

// Local-time helpers. We keep the value as 'YYYY-MM-DD' (what a native date input
// emits and the backend expects) and never touch UTC, so the day can't shift.
const pad = (n) => String(n).padStart(2, '0')
const toValue = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/**
 * Modern date picker with a custom calendar popup — replaces the native
 * `type="date"` control so it matches the app in every browser and in dark mode.
 * Same portalled, flip-aware popup approach as {@link Select} (our modals scroll
 * their body, which would clip an in-flow calendar). Value is 'YYYY-MM-DD'.
 */
export default function DatePicker({ value, onChange, placeholder, error, disabled }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const selected = parse(value)
  const today = new Date()
  const [view, setView] = useState(() => selected ?? today)
  const triggerRef = useRef(null)
  const popRef = useRef(null)

  // Reopen on the selected month each time it's opened.
  useEffect(() => {
    if (open) setView(parse(value) ?? new Date())
  }, [open, value])

  useEffect(() => {
    if (!open) return undefined
    const place = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const below = window.innerHeight - r.bottom
      const openUp = below < 360 && r.top > below
      setPos({
        left: r.left,
        width: Math.max(r.width, 288),
        top: r.bottom + 6,
        bottom: window.innerHeight - r.top + 6,
        openUp,
      })
    }
    place()
    const onScroll = () => place()
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !popRef.current?.contains(e.target))
        setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const lang = i18n.language || 'en'
  const monthTitle = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(view)
  // Weekday short names, Sunday-first (2023-01-01 was a Sunday).
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2023, 0, 1 + i)),
  )
  const displayValue = selected
    ? new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(selected)
    : ''

  // 42 cells starting from the Sunday on/before the 1st, so weeks line up.
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const pick = (d) => {
    onChange(toValue(d))
    setOpen(false)
    triggerRef.current?.focus()
  }
  const shiftMonth = (delta) =>
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        className={`${controlClass(error)} flex items-center justify-between gap-2 text-start`}
      >
        <span className={`min-w-0 flex-1 truncate ${displayValue ? '' : 'text-slate-400'}`}>
          {displayValue || placeholder || t('common.selectDate')}
        </span>
        <Icon name="clock" className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            className="custom-select-menu fixed z-[80] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
            style={{
              left: pos.left,
              width: pos.width,
              ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
            }}
          >
            {/* Month nav */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label={t('common.previous')}
              >
                <Icon name="chevronDown" className="h-4 w-4 rotate-90" />
              </button>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {monthTitle}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label={t('common.next')}
              >
                <Icon name="chevronDown" className="h-4 w-4 -rotate-90" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
              {weekdays.map((w, i) => (
                <span key={i} className="py-1">{w}</span>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === view.getMonth()
                const isSel = sameDay(d, selected)
                const isToday = sameDay(d, today)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(d)}
                    className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors ${
                      isSel
                        ? 'bg-amber-500 font-semibold text-white'
                        : isToday
                          ? 'font-semibold text-amber-600 ring-1 ring-inset ring-amber-400 dark:text-amber-300'
                          : inMonth
                            ? 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'
                            : 'text-slate-300 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-white/5'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Footer actions */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600"
              >
                {t('common.clear')}
              </button>
              <button
                type="button"
                onClick={() => pick(new Date())}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-300"
              >
                {t('common.today')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
