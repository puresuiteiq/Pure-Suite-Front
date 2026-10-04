import { useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import Icon from '../ui/Icon'
import Button from '../ui/Button'
import MenuItemCard from './MenuItemCard'
import SortableList from './SortableList'

/**
 * A collapsible category section: header with name + item count and
 * category-level actions, and a body listing its items. All mutations are
 * delegated to the parent via callbacks.
 */
export default function MenuCategory({
  category,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorderItems,
}) {
  const { t } = useVerticalT()
  const [expanded, setExpanded] = useState(true)
  const count = category.items.length

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      {/* flex-wrap with a 12rem basis on the title: when the three action
          buttons would leave the name too little room (every phone), they
          drop to their own row instead of squeezing it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-start"
          aria-expanded={expanded}
        >
          <Icon
            name="chevronDown"
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
              expanded ? '' : '-rotate-90 rtl:rotate-90'
            }`}
          />
          {/* Two lines: beside three action buttons a phone left the name
              ~80px, so even "Main Courses" was cut off. */}
          <h3 className="line-clamp-2 break-words font-semibold text-slate-900">
            {category.name}
          </h3>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {t('menu.items', { count })}
          </span>
        </button>

        <div className="ms-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Icon name="plus" className="h-4 w-4" />
            <span className="hidden sm:inline">{t('menu.addItem')}</span>
          </button>
          <button
            type="button"
            onClick={onEditCategory}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label={t('menu.editAria', { name: category.name })}
          >
            <Icon name="pencil" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDeleteCategory}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label={t('menu.deleteAria', { name: category.name })}
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div className="p-4">
          {count === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-500">{t('menu.noItems')}</p>
              <Button
                size="sm"
                variant="secondary"
                icon="plus"
                className="mt-3"
                onClick={onAddItem}
              >
                {t('menu.addFirstItem')}
              </Button>
            </div>
          ) : (
            // Drag an item by its handle to move it within this category.
            <SortableList
              items={category.items}
              onCommit={onReorderItems}
              className="space-y-2"
              renderItem={(item, handle) => (
                <MenuItemCard
                  item={item}
                  handle={handle}
                  onEdit={() => onEditItem(item)}
                  onDelete={() => onDeleteItem(item)}
                />
              )}
            />
          )}
        </div>
      )}
    </section>
  )
}
