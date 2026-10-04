import { useVerticalT } from '../../hooks/useVerticalT'
import Icon from '../ui/Icon'
import { formatCurrency } from '../../utils/format'
import { focusPosition } from '../../utils/coverFocus'

/**
 * A single menu item row with thumbnail, details and edit/delete actions.
 *
 * A product priced by size has no single price — the API reports the cheapest
 * variant as `price`. Rendering that alone hid every other size from the person
 * who set them, so sized products list their sizes instead.
 */
export default function MenuItemCard({ item, onEdit, onDelete, handle = null }) {
  const { t } = useVerticalT()
  const variants = Array.isArray(item.variants) ? item.variants : []

  return (
    // On phones the row was photo + two buttons + text squeezed into one line,
    // which left the name ~40px: even "Hummus" was cut off. Below sm the photo
    // is smaller, the buttons stack, and names get two lines.
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:gap-4">
      {/* Drag handle, when the list is reorderable (SortableList). */}
      {handle}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-16">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: focusPosition(item.coverFocus, '50% 0%') }}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon name="image" className="h-6 w-6 text-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Price under the name below sm: beside it, a 320px phone left the
            name about 34px. */}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="line-clamp-2 break-words text-sm font-medium text-slate-900 min-[380px]:text-base">{item.name}</h4>
            {item.availability && item.availability !== 'available' && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.availability === 'out_of_stock' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {t(`menu.availabilityOptions.${item.availability}`)}
              </span>
            )}
          </div>
          {variants.length === 0 && (
            <span className="me-2 shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">
              {formatCurrency(item.price, item.currency)}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
            {item.description}
          </p>
        )}
        {variants.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {variants.map((variant, i) => (
              <li
                key={`${variant.value ?? variant.size_name}-${i}`}
                // Name and price each stay whole; when a long size name leaves
                // no room, the price moves under it rather than both breaking.
                className="flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-xl bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-white/5"
              >
                <span className="whitespace-nowrap font-medium">{variant.value ?? variant.size_name}</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatCurrency(variant.price, item.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label={t('menu.editAria', { name: item.name })}
        >
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label={t('menu.deleteAria', { name: item.name })}
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
