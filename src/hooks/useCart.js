import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Shopping cart for the public storefront, scoped to one merchant and
 * persisted to localStorage so a refresh keeps the order.
 *
 * Only *identity* is stored — `{ id, productId, variantValue, quantity }`. The
 * name, image and above all the price are resolved from `menuItems` on every
 * render, so what the cart shows can never disagree with the live menu. A cart
 * that stored its own price copy would keep quoting whatever the item cost the
 * day it was added: a saved cart survived the USD→IQD migration still quoting
 * dollars, and it would drift again on any price edit.
 *
 * Resolved item shape: { id, productId, name, variantValue, price, image, quantity }.
 * `variantValue` is the chosen option value (a size like "Large" for a
 * restaurant, or "256GB"/"Black" for a store).
 */

/** Serialise the chosen extra-option values into a stable key fragment. */
const attrKey = (attributes) => {
  if (!attributes) return ''
  const keys = Object.keys(attributes).filter((k) => attributes[k])
  return keys.sort().map((k) => `${k}=${attributes[k]}`).join('|')
}

/** Stable per-line key: the same product in two options is two lines. */
const lineId = (productId, variantValue, attributes) => {
  const parts = [String(productId)]
  if (variantValue) parts.push(variantValue)
  const ak = attrKey(attributes)
  if (ak) parts.push(ak)
  return parts.join(':')
}

/**
 * Read + normalise stored entries. Tolerates the older shape (which carried
 * name/price/image) by keeping only the identity fields, so a cart saved
 * before this change is re-priced rather than discarded.
 */
function readEntries(key) {
  if (!key) return []
  try {
    const raw = JSON.parse(localStorage.getItem(key))
    if (!Array.isArray(raw)) return []
    return raw
      .filter((entry) => entry && entry.productId != null)
      .map((entry) => {
        const attributes =
          entry.attributes && typeof entry.attributes === 'object' ? entry.attributes : null
        const variantValue = entry.variantValue ?? entry.variantSize ?? null
        return {
          id: String(entry.id ?? lineId(entry.productId, variantValue, attributes)),
          productId: entry.productId,
          // Tolerate the pre-generalisation `variantSize` in a saved cart.
          variantValue,
          attributes,
          quantity: Math.max(1, Number(entry.quantity) || 1),
        }
      })
  } catch {
    return []
  }
}

export function useCart(merchantId, menuItems = []) {
  const key = merchantId ? `cart_${merchantId}` : null

  const [entries, setEntries] = useState(() => readEntries(key))
  const loadedKey = useRef(key)

  // Re-read when the storefront changes.
  //
  // The initialiser above runs once, but React Router reuses this component
  // when only the :merchantId param changes — so going from /r/shop-a to
  // /r/shop-b changed `key` while `entries` still held shop A's cart, and the
  // persist effect below then wrote A's cart into shop B's storage key,
  // destroying whatever B had saved.
  //
  // This has to happen during render, not in an effect. The persist effect also
  // depends on `key`, effects run in declaration order, and it is declared
  // first — so on the render where the key changed it would overwrite B's
  // storage before any reset effect could run. Adjusting state during render is
  // React's documented pattern for exactly this, and the ref makes it run once.
  if (loadedKey.current !== key) {
    loadedKey.current = key
    setEntries(readEntries(key))
  }

  useEffect(() => {
    if (!key) return
    try {
      localStorage.setItem(key, JSON.stringify(entries))
    } catch {
      // ignore quota / serialization errors — cart still works in-memory
    }
  }, [key, entries])

  const productsById = useMemo(() => {
    const map = new Map()
    for (const product of menuItems) map.set(String(product.id), product)
    return map
  }, [menuItems])

  /** Resolve one stored entry against the live menu, or null if it's gone. */
  const resolve = useCallback(
    (entry) => {
      const product = productsById.get(String(entry.productId))
      if (!product) return null
      const variants = Array.isArray(product.variants) ? product.variants : []
      const variant = entry.variantValue
        ? variants.find((v) => (v.value ?? v.size_name) === entry.variantValue)
        : null
      // The option this line was added with no longer exists on the product.
      if (entry.variantValue && !variant) return null

      return {
        id: entry.id,
        productId: entry.productId,
        name: product.name,
        variantValue: entry.variantValue,
        attributes: entry.attributes ?? null,
        price: Number(variant ? variant.price : product.price) || 0,
        // "Was" price for a discount (base-price lines only; variants price
        // themselves). Lets the cart strike the original like the storefront.
        originalPrice:
          !variant && product.originalPrice != null ? Number(product.originalPrice) : null,
        image: product.image || null,
        quantity: entry.quantity,
      }
    },
    [productsById],
  )

  const items = useMemo(
    () => entries.map(resolve).filter(Boolean),
    [entries, resolve],
  )

  // Drop lines whose product (or size) has left the menu. Guarded on a loaded
  // menu: while the fetch is in flight nothing resolves, and pruning then would
  // wipe a saved cart. usePublicRestaurant clears its categories when the
  // merchant changes, so this guard also covers the switch between storefronts
  // — otherwise the incoming shop's cart would be pruned against the outgoing
  // shop's products and emptied.
  useEffect(() => {
    if (!productsById.size) return
    setEntries((prev) => {
      const next = prev.filter((entry) => resolve(entry) !== null)
      return next.length === prev.length ? prev : next
    })
  }, [productsById, resolve])

  const addItem = useCallback((product, quantity = 1, variant = null, attributes = null) => {
    const amount = Math.max(1, Number(quantity) || 1)
    const variantValue = variant?.value ?? variant?.size_name ?? null
    const cleanAttrs =
      attributes && Object.keys(attributes).some((k) => attributes[k]) ? attributes : null
    const id = lineId(product.id, variantValue, cleanAttrs)
    setEntries((prev) => {
      const existing = prev.find((entry) => entry.id === id)
      if (existing) {
        return prev.map((entry) =>
          entry.id === id
            ? { ...entry, quantity: entry.quantity + amount }
            : entry,
        )
      }
      return [...prev, { id, productId: product.id, variantValue, attributes: cleanAttrs, quantity: amount }]
    })
  }, [])

  const increment = useCallback((id) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, quantity: entry.quantity + 1 } : entry,
      ),
    )
  }, [])

  const decrement = useCallback((id) => {
    setEntries((prev) =>
      prev.flatMap((entry) => {
        if (entry.id !== id) return [entry]
        return entry.quantity <= 1 ? [] : [{ ...entry, quantity: entry.quantity - 1 }]
      }),
    )
  }, [])

  const removeItem = useCallback((id) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  )
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  )

  return {
    items,
    addItem,
    increment,
    decrement,
    removeItem,
    clear,
    totalItems,
    totalPrice,
  }
}
