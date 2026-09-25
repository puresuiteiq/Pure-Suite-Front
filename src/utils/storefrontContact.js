import { normalizeWhatsAppNumber } from './order'

/**
 * The phone (opens WhatsApp, the same channel orders go through) and the
 * address (opens the pinned map location when there is one).
 */
export function contactLinks(profile) {
  const links = []
  if (profile.phone) {
    links.push({
      key: 'phone',
      icon: 'phone',
      label: profile.phone,
      ltr: true,
      href: `https://wa.me/${normalizeWhatsAppNumber(profile.phone)}`,
    })
  }
  if (profile.address) {
    links.push({
      key: 'address',
      icon: 'mapPin',
      label: profile.address,
      href:
        profile.mapUrl ||
        (profile.latitude != null && profile.longitude != null
          ? `https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`
          : null),
    })
  }
  return links
}
