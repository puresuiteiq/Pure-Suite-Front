import { useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { useVerticalT } from '../../hooks/useVerticalT'
import Icon from '../ui/Icon'

/**
 * A vertical list the merchant reorders by dragging — categories, or a
 * category's items.
 *
 * Dragging starts only from each row's handle, so a row's own buttons keep
 * working and a finger scrolling the page on a phone never picks a row up.
 * The handle also answers ↑ / ↓ for anyone not using a pointer.
 *
 * The order moves locally while dragging; `onCommit(ids)` runs once, on drop,
 * and only when the order actually changed. If it throws, the parent puts the
 * old order back (useMenu does) and the list follows it.
 *
 * `renderItem(item, handle)` draws a row with `handle` wherever it belongs.
 */
export default function SortableList({ items, onCommit, renderItem, className = '', itemClassName = '' }) {
  const [draft, setDraftState] = useState(items)
  // The latest draft, readable from the drop handler without going through a
  // state updater (StrictMode runs those twice, which would save twice).
  const draftRef = useRef(items)
  const setDraft = (next) => {
    draftRef.current = next
    setDraftState(next)
  }
  const dragging = useRef(false)

  // Follow the parent's list (a load, an add, a delete, a rolled-back save) —
  // except mid-drag, when the draft is the truth.
  useEffect(() => {
    if (dragging.current) return
    draftRef.current = items
    setDraftState(items)
  }, [items])

  const commit = (next) => {
    const ids = next.map((item) => item.id)
    if (ids.join() !== items.map((item) => item.id).join()) onCommit(ids)
  }

  const moveBy = (item, step) => {
    const current = draftRef.current
    const from = current.indexOf(item)
    const to = from + step
    if (from < 0 || to < 0 || to >= current.length) return
    const next = [...current]
    next.splice(from, 1)
    next.splice(to, 0, item)
    setDraft(next)
    commit(next)
  }

  return (
    <Reorder.Group as="ul" axis="y" values={draft} onReorder={setDraft} className={className}>
      {draft.map((item) => (
        <SortableRow
          key={item.id}
          item={item}
          className={itemClassName}
          onDragStart={() => {
            dragging.current = true
          }}
          onDragEnd={() => {
            dragging.current = false
            commit(draftRef.current)
          }}
          onMove={(step) => moveBy(item, step)}
          renderItem={renderItem}
        />
      ))}
    </Reorder.Group>
  )
}

function SortableRow({ item, className, onDragStart, onDragEnd, onMove, renderItem }) {
  const { t } = useVerticalT()
  const controls = useDragControls()

  const handle = (
    <button
      type="button"
      // touch-action none: the pointer belongs to the drag, not to scrolling.
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => controls.start(event)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          onMove(-1)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          onMove(1)
        }
      }}
      aria-label={t('menu.reorder.handle')}
      title={t('menu.reorder.handle')}
      className="sortable-handle flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-white/10 dark:hover:text-slate-200"
    >
      <Icon name="grip" className="h-5 w-5" />
    </button>
  )

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 18px 40px -12px rgb(15 23 42 / 0.35)' }}
      className={`relative list-none ${className}`}
    >
      {renderItem(item, handle)}
    </Reorder.Item>
  )
}
