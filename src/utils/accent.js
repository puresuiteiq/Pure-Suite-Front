/**
 * Applies a brand accent (primary + shadow) as CSS variables on <html>, the way
 * the merchant panel and storefront do. Used by the Super Admin dashboard so the
 * platform owner can colour their own buttons.
 *
 * Sets `--merchant-primary`/`--merchant-shadow` (the gradient buttons read these)
 * and `--primary-color` + `data-merchant-brand` (so any `brand-600` utilities are
 * remapped too — see the rules in index.css).
 */
export const DEFAULT_ADMIN_ACCENT = '#f59e0b'
export const DEFAULT_ADMIN_SHADOW = '#ea580c'

export function applyAccentVars(primary, shadow) {
  const root = document.documentElement
  const p = primary || DEFAULT_ADMIN_ACCENT
  root.style.setProperty('--merchant-primary', p)
  root.style.setProperty('--merchant-shadow', shadow || primary || DEFAULT_ADMIN_SHADOW)
  root.style.setProperty('--primary-color', p)
  root.setAttribute('data-merchant-brand', '')
}

export function clearAccentVars() {
  const root = document.documentElement
  root.style.removeProperty('--merchant-primary')
  root.style.removeProperty('--merchant-shadow')
  root.style.removeProperty('--primary-color')
  root.removeAttribute('data-merchant-brand')
}
