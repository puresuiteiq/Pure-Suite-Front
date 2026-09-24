/**
 * Inline style for a portalled panel (Modal, or anything else rendered to
 * document.body) whose background should match the merchant's own storefront
 * theme — the same --storefront-background(-shadow) vars .public-storefront,
 * ProductDetailSheet and StorefrontInfoDrawer already use. Dark mode uses the
 * vars as-is since they're always the flat near-black default there (merchant
 * background customisation is light-mode only).
 *
 * Light mode mixes toward white (not the raw colour) purely so an arbitrary,
 * possibly very dark merchant pick doesn't make body text unreadable — but at
 * a strength that reads as clearly purple/whatever-the-merchant-picked, the
 * same saturation as the page behind the modal (.public-storefront::before),
 * not a barely-there pastel hint. A first pass here (16%/22%) was called out
 * as looking basically white next to the page's own much bolder glow.
 *
 * Must be applied as a real inline style, not a className: the target here
 * (Modal's .luxury-modal panel) sets its background via unlayered plain CSS,
 * which always outranks a same-specificity Tailwind utility regardless of
 * `!`/important prefixes — only genuine inline style reliably wins.
 */
export function themedPanelStyle(theme) {
  return {
    backgroundImage:
      theme === 'dark'
        ? 'linear-gradient(165deg, var(--storefront-background), var(--storefront-background-shadow))'
        : 'linear-gradient(165deg, color-mix(in srgb, var(--storefront-background) 46%, white), color-mix(in srgb, var(--storefront-background-shadow) 60%, white))',
  }
}
