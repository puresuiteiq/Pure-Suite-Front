/**
 * Order service methods a merchant can offer: delivery (with per-zone fees),
 * dine-in (table service), and pickup. The merchant's config is stored on the
 * profile as `serviceMethods` (JSON); null/empty means "not configured" and the
 * storefront checkout stays plain (no method picker, no fee).
 *
 * Shape:
 *   { delivery: { enabled, zones: [{ name, fee, areas?: [{ name, fee }] }] },
 *     dinein:   { enabled },
 *     pickup:   { enabled } }
 */
export const SERVICE_METHOD_KEYS = ['delivery', 'dinein', 'pickup']

/**
 * Methods that make sense for a given vertical. Dine-in ("table service") is
 * restaurant-only — a clothing/store merchant never seats diners — so it is
 * dropped for stores, leaving delivery + pickup.
 */
export const serviceMethodKeysForMode = (mode) =>
  mode === 'store' ? ['delivery', 'pickup'] : SERVICE_METHOD_KEYS

/** i18n key for a method's label (shared by the merchant + storefront). */
export const methodLabelKey = (key) => `serviceMethods.${key}`

/** Fill a possibly-null/partial config out to the full, safe shape. */
export function normalizeServiceMethods(cfg) {
  return {
    delivery: {
      enabled: Boolean(cfg?.delivery?.enabled),
      zones: (Array.isArray(cfg?.delivery?.zones) ? cfg.delivery.zones : []).map((z) => ({
        name: String(z?.name ?? ''),
        fee: Math.max(0, Math.round(Number(z?.fee) || 0)),
        areas: (Array.isArray(z?.areas) ? z.areas : [])
          .map((area) => ({
            name: String(area?.name ?? '').trim(),
            fee: Math.max(0, Math.round(Number(area?.fee) || 0)),
          }))
          .filter((area) => area.name),
      })),
    },
    dinein: { enabled: Boolean(cfg?.dinein?.enabled) },
    pickup: { enabled: Boolean(cfg?.pickup?.enabled) },
  }
}

/** The enabled method keys, in display order. [] when none are configured. */
export function enabledMethods(cfg) {
  if (!cfg) return []
  return SERVICE_METHOD_KEYS.filter((key) => cfg[key]?.enabled)
}
