import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { controlClass } from '../../utils/form'

/**
 * Modern dropdown that replaces the native <select> so it matches the app's
 * styling in both light and dark and looks consistent across browsers.
 *
 * The trigger reuses the shared `form-input` look (so it lines up with the
 * FormField leading icon), and the option list is PORTALLED to <body> with
 * fixed positioning — our modals scroll their body with `overflow-y-auto`, which
 * would otherwise clip an in-flow dropdown. It flips above the trigger when
 * there isn't room below, tracks scroll/resize, and closes on outside-click or
 * Escape.
 *
 * `options`: [{ value, label, icon? }]. `onChange(value)` gets the raw value.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return undefined

    const place = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const below = window.innerHeight - r.bottom
      const openUp = below < 260 && r.top > below
      const maxHeight = Math.min(288, (openUp ? r.top : below) - 16)
      setPos({
        left: r.left,
        width: r.width,
        top: r.bottom + 6,
        bottom: window.innerHeight - r.top + 6,
        openUp,
        maxHeight,
      })
    }
    place()

    const onScroll = () => place()
    const onDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !listRef.current?.contains(e.target)
      )
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

  const choose = (v) => {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        className={`${controlClass(error)} flex items-center justify-between gap-2 text-start ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="chevronDown"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="custom-select-menu fixed z-[80] origin-top overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.04] backdrop-blur-xl animate-[menu-pop_160ms_cubic-bezier(0.22,1,0.36,1)] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar]:w-1.5 dark:border-white/10 dark:bg-slate-900/95 dark:ring-white/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/15"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.openUp ? { bottom: pos.bottom } : { top: pos.top }),
            }}
          >
            {options.map((o) => {
              const isSel = o.value === value
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => choose(o.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                      isSel
                        ? 'bg-slate-100 font-bold text-slate-900 dark:bg-white/10 dark:text-white'
                        : 'font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    {o.icon && (
                      <Icon name={o.icon} className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {isSel && <Icon name="check" className="accent-text h-4 w-4 shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </>
  )
}
