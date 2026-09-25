/**
 * What a storefront tile needs to know about a product beyond its text:
 * its cover image, whether it can be ordered, and its discount.
 *
 * The same rules PublicItemCard applies, shared so every storefront theme
 * blocks the same items and shows the same discount. Pure, for `npm test`.
 */
export function itemState(item) {
  const cover = (Array.isArray(item?.images) && item.images[0]) || item?.image || null
  const unavailable = item?.availability === 'unavailable'
  // Merchant-set availability, plus stock=0 counting as sold out for stores.
  const soldOut =
    item?.availability === 'out_of_stock' || (item?.stock != null && Number(item.stock) <= 0)
  const originalPrice = item?.originalPrice != null ? Number(item.originalPrice) : null
  // Only a "was" price above the current one is a discount.
  const hasDiscount = originalPrice != null && originalPrice > Number(item?.price)
  return {
    cover,
    // Where the cover sits in its frame (null = the card's own default).
    focus: item?.coverFocus ?? null,
    blocked: unavailable || soldOut,
    // The one state worth a badge: a normal, orderable item gets none.
    status: unavailable ? 'unavailable' : soldOut ? 'soldOut' : null,
    originalPrice,
    hasDiscount,
    discountPct: hasDiscount ? Math.round((1 - Number(item.price) / originalPrice) * 100) : 0,
  }
}
