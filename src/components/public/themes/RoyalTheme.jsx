import { motion, useReducedMotion } from 'framer-motion'
import Icon from '../../ui/Icon'
import Price from '../Price'
import SocialLinks from '../SocialLinks'
import StarRating from '../../reviews/StarRating'
import { OpenStatus, StorefrontTools } from './ThemeShared'
import { useVerticalT } from '../../../hooks/useVerticalT'
import { useActiveTabInView } from '../../../hooks/useActiveTabInView'
import { itemState } from '../../../utils/itemState'
import { focusPosition } from '../../../utils/coverFocus'
import { contactLinks } from '../../../utils/storefrontContact'

/**
 * "Royal" — the storefront as a fine-dining menu card.
 *
 * A centred crest (the logo in a double ring) over the name set in Amiri, an
 * ornamental rule, and the menu as a printed list: each dish's name joined to
 * its price by a dotted leader, the way a good restaurant's card is set.
 * Ivory in light mode, near-black in dark, with every line and ornament drawn
 * in the merchant's own colour. Styling lives in index.css under .sf-theme-royal.
 */

/** ── ◆ ── in the merchant's colour. */
function Ornament({ className = '' }) {
  return (
    <span aria-hidden="true" className={`sf-royal-ornament flex items-center justify-center gap-2.5 ${className}`}>
      <span className="sf-royal-rule h-px w-12 sm:w-20" />
      <span className="sf-royal-diamond h-1.5 w-1.5 rotate-45" />
      <span className="sf-royal-diamond h-2.5 w-2.5 rotate-45" />
      <span className="sf-royal-diamond h-1.5 w-1.5 rotate-45" />
      <span className="sf-royal-rule h-px w-12 sm:w-20" />
    </span>
  )
}

export function RoyalHeader({
  profile,
  businessName,
  reviewsEnabled,
  reviewCount,
  avgRating,
  isOpen,
  searchOpen,
  onToggleSearch,
  onAbout,
}) {
  const { t } = useVerticalT()
  const reduceMotion = useReducedMotion()
  const links = contactLinks(profile)
  const rise = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <header className="sf-header sf-royal-header relative overflow-hidden">
      <span aria-hidden="true" className="sf-royal-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-4 text-center sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <OpenStatus isOpen={isOpen} className="sf-royal-status text-xs font-semibold" />
          <StorefrontTools searchOpen={searchOpen} onToggleSearch={onToggleSearch} />
        </div>

        <motion.div {...rise(0.05)} className="mt-6 flex justify-center">
          <div className="sf-royal-crest relative rounded-full p-[5px]">
            <div className="sf-royal-crest-inner flex h-24 w-24 items-center justify-center overflow-hidden rounded-full sm:h-28 sm:w-28">
              {profile.logo ? (
                <img src={profile.logo} alt="" decoding="async" className="h-full w-full object-contain p-2" />
              ) : (
                <span className="sf-royal-display text-4xl font-bold">{businessName.charAt(0)}</span>
              )}
            </div>
          </div>
        </motion.div>

        <motion.p {...rise(0.15)} className="sf-royal-kicker mt-5 text-xs font-semibold sm:text-sm">
          {t('public.royal.kicker')}
        </motion.p>
        <motion.h1
          {...rise(0.22)}
          className="sf-royal-display sf-royal-title mt-1 break-words text-4xl font-bold leading-tight sm:text-5xl"
        >
          {businessName}
        </motion.h1>
        <motion.div {...rise(0.3)}>
          <Ornament className="mt-4" />
        </motion.div>

        {profile.description && (
          <motion.button
            {...rise(0.36)}
            type="button"
            onClick={onAbout}
            className="sf-royal-desc mx-auto mt-4 line-clamp-2 max-w-xl text-sm leading-relaxed sm:text-base"
          >
            {profile.description}
          </motion.button>
        )}

        {reviewsEnabled && reviewCount > 0 && (
          <motion.div {...rise(0.42)} className="mt-4 flex items-center justify-center gap-2">
            <StarRating value={avgRating} size="sm" />
            <span className="sf-royal-muted text-xs font-semibold">
              {avgRating.toFixed(1)} · {t('public.reviewCount', { count: reviewCount })}
            </span>
          </motion.div>
        )}

        {links.length > 0 && (
          <motion.div
            {...rise(0.48)}
            className="sf-royal-muted mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
          >
            {links.map((link) => {
              const content = (
                <>
                  <Icon name={link.icon} className="sf-royal-accent h-4 w-4 shrink-0" />
                  <span dir={link.ltr ? 'ltr' : undefined} className="truncate">
                    {link.label}
                  </span>
                </>
              )
              return link.href ? (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sf-royal-link inline-flex max-w-full items-center gap-1.5"
                >
                  {content}
                </a>
              ) : (
                <span key={link.key} className="inline-flex max-w-full items-center gap-1.5">
                  {content}
                </span>
              )
            })}
          </motion.div>
        )}

        <motion.div {...rise(0.54)}>
          <SocialLinks links={profile.socialLinks} className="mt-5 justify-center" />
        </motion.div>
      </div>
    </header>
  )
}

export function RoyalCategoryNav({ categories, activeId, onSelect }) {
  const barRef = useActiveTabInView(activeId)
  return (
    <nav className="sf-category-nav sf-royal-nav">
      <div ref={barRef} className="scrollbar-hide mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 sm:px-6">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              type="button"
              data-category-id={category.id}
              onClick={() => onSelect(category.id)}
              aria-current={active ? 'true' : undefined}
              className={`sf-royal-tab sf-royal-display relative shrink-0 whitespace-nowrap px-4 py-3.5 text-base font-bold ${active ? 'is-active' : ''}`}
            >
              {category.name}
              <span aria-hidden="true" className="sf-royal-tab-mark absolute inset-x-4 bottom-0 h-[2px]" />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function RoyalItem({ item, onOpen, onQuickAdd }) {
  const { t } = useVerticalT()
  const { cover, focus, blocked, status, originalPrice, hasDiscount, discountPct } = itemState(item)
  return (
    <div className={`sf-royal-item group relative flex gap-4 py-5 ${blocked ? 'is-blocked' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={item.name}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--merchant-primary)]"
      />
      {cover && (
        <div className="sf-royal-thumb pointer-events-none relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-24">
          <img
            loading="lazy"
            decoding="async"
            src={cover}
            alt=""
            style={{ objectPosition: focusPosition(focus) }}
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${blocked ? 'opacity-60 grayscale' : ''}`}
          />
          {hasDiscount && (
            <span className="sf-royal-discount absolute start-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              <bdi dir="ltr">-{discountPct}%</bdi>
            </span>
          )}
        </div>
      )}

      <div className="pointer-events-none relative min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h4 className="sf-royal-display sf-royal-item-name line-clamp-2 min-w-0 text-lg font-bold leading-snug sm:text-xl">
            {item.name}
          </h4>
          <span aria-hidden="true" className="sf-royal-leader mb-1.5 min-w-4 flex-1 self-end" />
          <Price value={item.price} currency={item.currency} className="price-text sf-royal-price shrink-0 text-base font-bold tabular-nums" />
        </div>
        {item.brand && <p className="sf-royal-muted mt-0.5 text-[11px] font-semibold">{item.brand}</p>}
        {item.description && (
          <p className="sf-royal-muted mt-1 line-clamp-2 text-sm leading-relaxed">{item.description}</p>
        )}
        <div className="mt-2.5 flex min-h-8 items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs">
            {hasDiscount && (
              <Price value={originalPrice} currency={item.currency} className="sf-royal-muted line-through tabular-nums" />
            )}
            {status && (
              <span className="sf-royal-badge rounded-full px-2 py-0.5 font-semibold">
                {status === 'unavailable' ? t('public.unavailable') : t('public.outOfStock')}
              </span>
            )}
          </span>
          {!blocked && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onQuickAdd?.(item)
              }}
              aria-label={t('public.quickAdd', { name: item.name })}
              className="sf-royal-add pointer-events-auto relative z-10 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold transition-transform hover:scale-105 active:scale-95"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              {t('public.add')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function RoyalMenu({ categories, onOpen, onQuickAdd }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="space-y-14">
      {categories.map((category) => (
        <motion.section
          key={category.id}
          id={`category-${category.id}`}
          className="scroll-mt-28"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-2 text-center">
            <h3 className="sf-royal-display sf-royal-section-title text-3xl font-bold sm:text-4xl">{category.name}</h3>
            <Ornament className="mt-3" />
          </div>
          <div className="sf-royal-list grid grid-cols-1 gap-x-12 md:grid-cols-2">
            {category.items.map((item) => (
              <RoyalItem key={item.id} item={item} onOpen={() => onOpen(item)} onQuickAdd={onQuickAdd} />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  )
}
