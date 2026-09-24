import instagramIcon from '../../assets/picture/instagram-social.png'
// The background-removal threshold was re-tuned (220, was 238) so it also
// catches the faint watermark grid this file had baked into its "white"
// background, instead of leaving it as visible checkering once transparent.
import whatsappIcon from '../../assets/picture/whatsapp-icon.png'
import tiktokIcon from '../../assets/picture/tiktok.png'
// CSS `filter: invert()` (the first attempt at a dark-mode variant) rendered
// as a checkerboard in the browser — a real compositing quirk, not just a
// preview-tool artifact — so this is a genuine pre-rendered white asset
// instead: same shape, RGB set to white, alpha untouched.
import tiktokIconWhite from '../../assets/picture/tiktok-white.png'
// Background-removed the same way as the others (the original "facebook
// icon.webp" had a plain opaque white square around it) — every icon here
// floats with no background box now, none as a special case.
import facebookIcon from '../../assets/picture/facebook-icon.png'

const NETWORKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
]

// The merchant-provided artwork — real logos instead of hand-drawn
// approximations. No Snapchat file was provided, so that one keeps a clean
// drawn mark instead (see SnapchatMark below).
const ICONS = {
  instagram: instagramIcon,
  whatsapp: whatsappIcon,
  tiktok: tiktokIcon,
  facebook: facebookIcon,
}

function externalUrl(network, rawValue) {
  const value = String(rawValue ?? '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
    } catch {
      return null
    }
  }

  const handle = value.replace(/^@/, '').replace(/^\/+/, '')
  if (!handle) return null
  if (network === 'whatsapp') {
    const phone = handle.replace(/[^\d]/g, '')
    return phone ? `https://wa.me/${phone}` : null
  }
  const base = {
    instagram: 'https://www.instagram.com/',
    snapchat: 'https://www.snapchat.com/add/',
    facebook: 'https://www.facebook.com/',
    tiktok: 'https://www.tiktok.com/@',
  }[network]
  return base ? `${base}${encodeURIComponent(handle)}` : null
}

function SnapchatMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="0" y="0" width="24" height="24" rx="7" fill="#FFFC00" />
      <path
        d="M12 5c2.4 0 4.3 2 4.3 4.5v1.7c.7.2 1.4.5 1.9.9.3.3.2.7-.2.8a4 4 0 0 1-1.3.3c0 .3.1.7.3.9.3.5.9.8 1.5.9.4.1.5.6.2.9-.4.3-1 .5-1.6.6-.1.3-.2.7-.4.9-.2.2-.7.2-1.1.1-.4-.1-.8-.1-1.2.1-.5.3-1 .9-2.2.9s-1.7-.6-2.2-.9c-.4-.2-.8-.2-1.2-.1-.4.1-.9.1-1.1-.1-.2-.2-.3-.6-.4-.9-.6-.1-1.2-.3-1.6-.6-.3-.3-.2-.8.2-.9.6-.1 1.2-.4 1.5-.9.2-.2.3-.6.3-.9a4 4 0 0 1-1.3-.3c-.4-.1-.5-.5-.2-.8.5-.4 1.2-.7 1.9-.9V9.5C7.7 7 9.6 5 12 5Z"
        fill="#ffffff"
        stroke="#171717"
        strokeWidth="0.55"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const VECTOR_MARKS = {
  snapchat: SnapchatMark,
}

/**
 * Public-only social account shortcuts. Empty fields intentionally render
 * nothing — a merchant who hasn't filled in Snapchat/Facebook simply won't
 * show those icons, not every network at once.
 */
export default function SocialLinks({ links, className = '' }) {
  const available = NETWORKS
    .map((network) => ({ ...network, href: externalUrl(network.key, links?.[network.key]) }))
    .filter((network) => network.href)

  if (!available.length) return null

  // Shrink once there are more than 3 — the header row that hosts these
  // (PublicMenu) no longer wraps them to a second line when they overflow,
  // so the icons themselves give a little ground instead: still all visible
  // on one line, just a size down, rather than one icon per network at a
  // fixed size pushing the row wider than it has room for.
  const compact = available.length > 3
  const sizeClass = compact ? 'h-5 w-5' : 'h-6 w-6'

  return (
    <nav aria-label="Social media" className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'} ${className}`}>
      {available.map((network) => {
        const icon = ICONS[network.key]
        const VectorMark = VECTOR_MARKS[network.key]
        // TikTok's mark is solid black line art on transparency — invisible
        // against a dark storefront background. Two pre-rendered images (not
        // a CSS invert filter, which composited as a checkerboard in the
        // browser) swap by theme via plain visibility classes.
        const isTikTok = network.key === 'tiktok'
        return (
          <a
            key={network.key}
            href={network.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={network.label}
            title={network.label}
            className={`inline-flex shrink-0 items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 drop-shadow-[0_3px_8px_rgba(0,0,0,0.35)] ${sizeClass}`}
          >
            {isTikTok ? (
              <>
                <img src={tiktokIcon} alt="" className="h-full w-full object-contain dark:hidden" />
                <img src={tiktokIconWhite} alt="" className="hidden h-full w-full object-contain dark:block" />
              </>
            ) : icon ? (
              <img src={icon} alt="" className="h-full w-full object-contain" />
            ) : (
              <VectorMark className={sizeClass} />
            )}
          </a>
        )
      })}
    </nav>
  )
}
