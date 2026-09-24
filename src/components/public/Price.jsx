import { formatCurrency } from '../../utils/format'

/**
 * A storefront price: formatCurrency() inside `<bdi translate="no">`.
 *
 * <bdi> isolates the amount and its unit from the text beside them, so in an
 * RTL line a neighbouring label can't reorder "25,000" and "د.ع". The
 * translate opt-out keeps browser translation off the thing it damaged most —
 * it rewrote د.ع as a different currency on customers' phones.
 *
 * Styling is the caller's; this only guarantees how a price is written.
 */
export default function Price({ value, className = '' }) {
  return (
    <bdi translate="no" className={`notranslate ${className}`}>
      {formatCurrency(value)}
    </bdi>
  )
}
