import { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { VerticalContext } from '../context/VerticalContext'

/**
 * Vertical-aware translation. Returns a `t` that injects the current business
 * type as an i18next context, so `t('menu.title')` resolves to
 * `menu.title_store` for a store and falls back to the base (restaurant)
 * `menu.title` when no `_store` variant exists.
 *
 * Because i18next falls back to the base key, only the subset of strings that
 * actually differ between verticals needs a `_store` entry — everything else
 * keeps working unchanged. Use this in vertical-specific UI (menu/catalog
 * management, merchant profile/dashboard, public storefront). The Super Admin
 * area, which spans many merchants, keeps plain useTranslation.
 *
 * Returns `vertical` too, for the few places that branch on type in code
 * (e.g. showing a brand field only for stores). `rawT` is the un-contextual
 * `t` for keys that must never be re-mapped.
 */
export function useVerticalT() {
  const { t, i18n } = useTranslation()
  const vertical = useContext(VerticalContext)

  const vt = useCallback(
    (key, options) => t(key, { context: vertical, ...options }),
    [t, vertical],
  )

  return { t: vt, rawT: t, i18n, vertical }
}
