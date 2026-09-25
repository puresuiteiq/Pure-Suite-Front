import { formatMoney } from './currency'

// The WhatsApp message is restaurant-facing and written in Arabic, so amounts
// use the Arabic dinar unit regardless of the customer's UI language.
const money = (v, currency = 'IQD') => formatMoney(v, currency, 'ar')

// Arabic labels for the service methods (the message stays fully Arabic).
const METHOD_AR = {
  delivery: 'توصيل',
  dinein: 'خدمة الطاولة',
  pickup: 'استلام',
}

/**
 * Creates the customer-facing WhatsApp message using literal Unicode text.
 * Keep this string here (rather than constructing it in a component) so its
 * UTF-8 characters are preserved in one place.
 */
export function formatOrderMessage({
  customerName,
  phone,
  address,
  cartItems,
  subtotal,
  total,
  notes,
  orderNumber,
  serviceMethod,
  deliveryZone,
  deliveryFee,
  tableNumber,
}) {
  const items = cartItems
    .map((item) => {
      // The chosen options — priced variant + extra values (e.g. "Blue · L").
      const opts = [item.variantValue, ...Object.values(item.attributes ?? {})].filter(Boolean)
      const optsText = opts.length ? ` (${opts.join(' · ')})` : ''
      return `• ${item.name}${optsText} (x${item.quantity}): ${money(item.price, item.currency)}`
    })
    .join('\n')

  // The per-restaurant order number, so the customer's message and the
  // restaurant's dashboards reference the same order. Omitted if absent.
  const orderLine = orderNumber != null ? `🧾 *طلب رقم:* #${orderNumber}\n` : ''
  const nameLine = customerName ? `👤 الاسم: ${customerName}\n` : ''

  // Service method line (with zone / table detail). Omitted when unconfigured.
  let methodLine = ''
  if (serviceMethod && METHOD_AR[serviceMethod]) {
    let detail = ''
    if (serviceMethod === 'delivery' && deliveryZone) detail = ` — ${deliveryZone}`
    if (serviceMethod === 'dinein' && tableNumber) detail = ` — طاولة ${tableNumber}`
    methodLine = `🛎️ طريقة الاستلام: ${METHOD_AR[serviceMethod]}${detail}\n`
  }

  // Address only matters when there is one (delivery / legacy checkout).
  const addressLine = address ? `📍 العنوان: ${address}\n` : ''

  // Totals: itemise the delivery fee when there is one, else a single total.
  const totalCurrency = cartItems.find((item) => item.currency)?.currency ?? 'IQD'
  const totals =
    deliveryFee > 0
      ? `💵 المجموع الفرعي: ${money(subtotal, totalCurrency)}
🛵 أجرة التوصيل: ${money(deliveryFee)}
💰 *الإجمالي: ${money(total, totalCurrency)}*`
      : `💰 *المجموع: ${money(total, totalCurrency)}*`

  return `*طلب جديد 🧾*
${orderLine}${nameLine}📱 الهاتف: ${phone}
${methodLine}${addressLine}
🛒 *الطلبات:*
${items}

${totals}${notes ? `
📝 ملاحظات: ${notes}` : ''}`
}

/**
 * Normalize a phone to the international digits WhatsApp expects (no +, no
 * leading 0). WhatsApp rejects local numbers like "07501995465" — it needs the
 * country code. A "00" international prefix is dropped; a single leading 0 is a
 * local Iraqi number, so it's replaced with Iraq's country code (964).
 */
export function normalizeWhatsAppNumber(phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `964${digits.slice(1)}`
  return digits
}

/**
 * Build a WhatsApp deep link. `encodeURIComponent` encodes the complete
 * UTF-8 message, including Arabic text and literal emoji characters.
 */
export function buildWhatsAppUrl(phone, message) {
  const digits = normalizeWhatsAppNumber(phone)
  // Use WhatsApp's direct send endpoint. On some desktop installations the
  // wa.me redirect can mangle non-ASCII query text before handing it to the
  // native app; this endpoint receives the percent-encoded UTF-8 text intact.
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`
}
