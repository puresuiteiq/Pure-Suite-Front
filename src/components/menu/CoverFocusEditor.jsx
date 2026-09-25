import { useRef, useState } from 'react'
import Icon from '../ui/Icon'
import { useVerticalT } from '../../hooks/useVerticalT'
import { CENTER, coverOverflow, dragFocus, focusPosition } from '../../utils/coverFocus'

/**
 * "Reposition" for a product's cover, the way Facebook does it for a cover
 * photo: the photo sits in a frame the shape of this store's product cards,
 * and the merchant drags it until the part they want is in view.
 *
 * Only the framing changes (a focus point used as the card's object-position);
 * the photo is stored whole, so the product sheet still shows all of it.
 *
 * `frame` is the storefront design's card frame ({ aspect, round, fallback }),
 * so what the merchant sees here is what customers see on the card.
 */
export default function CoverFocusEditor({ src, focus, onChange, frame }) {
  const { t } = useVerticalT()
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  const drag = useRef(null)
  const [dragging, setDragging] = useState(false)

  const position = focusPosition(focus, frame.fallback)
  // The point the photo is at now, even before the merchant first moves it.
  const current = () => {
    if (focus) return focus
    const [x, y] = frame.fallback.split(' ').map((part) => parseFloat(part))
    return { x, y }
  }

  const overflow = () => {
    const img = imgRef.current
    const box = frameRef.current?.getBoundingClientRect()
    return coverOverflow(img?.naturalWidth, img?.naturalHeight, box?.width, box?.height)
  }

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    frameRef.current?.setPointerCapture?.(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, start: current(), overflow: overflow() }
    setDragging(true)
  }

  const onPointerMove = (event) => {
    const d = drag.current
    if (!d) return
    onChange(dragFocus(d.start, event.clientX - d.x, event.clientY - d.y, d.overflow))
  }

  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  // Arrow keys nudge it, for anyone not dragging. Physical directions, like
  // the drag: the photo moves the way the arrow points, in RTL too.
  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 3
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const box = frameRef.current?.getBoundingClientRect()
    // Treat a step as that share of the frame, then reuse the drag maths.
    const pixels = [(move[0] / 100) * (box?.width ?? 100), (move[1] / 100) * (box?.height ?? 100)]
    onChange(dragFocus(current(), pixels[0], pixels[1], overflow()))
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('menu.coverFocus.title')}</span>
        <button
          type="button"
          onClick={() => onChange({ ...CENTER })}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Icon name="refresh" className="h-3.5 w-3.5" />
          {t('menu.coverFocus.center')}
        </button>
      </div>

      <div className="mt-3 flex justify-center">
        <div
          ref={frameRef}
          role="slider"
          tabIndex={0}
          aria-label={t('menu.coverFocus.title')}
          aria-valuetext={t('menu.coverFocus.value', { x: current().x, y: current().y })}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ aspectRatio: frame.aspect, touchAction: 'none' }}
          className={`group relative w-full max-w-[15rem] cursor-grab select-none overflow-hidden bg-slate-100 shadow-md ring-2 ring-[var(--merchant-primary)] focus:outline-none focus-visible:ring-4 active:cursor-grabbing dark:bg-slate-800 ${
            frame.round ? 'rounded-full' : 'rounded-2xl'
          }`}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            style={{ objectPosition: position }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* Rule of thirds while dragging, like any photo cropper. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${dragging ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage:
                'linear-gradient(to right, transparent 33%, rgb(255 255 255 / .55) 33%, rgb(255 255 255 / .55) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgb(255 255 255 / .55) 66%, rgb(255 255 255 / .55) calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, rgb(255 255 255 / .55) 33%, rgb(255 255 255 / .55) calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, rgb(255 255 255 / .55) 66%, rgb(255 255 255 / .55) calc(66% + 1px), transparent calc(66% + 1px))',
            }}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-200 ${dragging ? 'opacity-0' : 'opacity-100'}`}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <Icon name="move" className="h-3.5 w-3.5" />
              {t('menu.coverFocus.drag')}
            </span>
          </span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('menu.coverFocus.hint')}
      </p>
    </div>
  )
}
