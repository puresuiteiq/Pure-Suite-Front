import { motion, useReducedMotion } from 'framer-motion'
import Icon from '../../ui/Icon'
import Price from '../Price'
import SocialLinks from '../SocialLinks'
import { OpenStatus, StorefrontTools } from './ThemeShared'
import { useVerticalT } from '../../../hooks/useVerticalT'
import { useActiveTabInView } from '../../../hooks/useActiveTabInView'
import { itemState } from '../../../utils/itemState'
import { focusPosition } from '../../../utils/coverFocus'
import { contactLinks } from '../../../utils/storefrontContact'

/**
 * "Modern" — the storefront as a delivery app.
 *
 * A cover in the merchant's colours, the store's card floating over it with
 * the logo breaking its top edge, categories as round photo bubbles (story
 * style) that stay pinned while browsing, and big photo-first product cards
 * with the price on the picture and a solid add button. Styling lives in
 * index.css under .sf-theme-modern.
 */

export function ModernHeader({
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
  const hasSocial = Object.values(profile.socialLinks || {}).some(Boolean)

  return (
    <header className="sf-header sf-modern-header">
      <div className="sf-modern-cover relative h-44 overflow-hidden sm:h-56">
        <span aria-hidden="true" className="sf-modern-cover-art absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl justify-end px-4 pt-3 sm:px-6">
          <StorefrontTools
            searchOpen={searchOpen}
            onToggleSearch={onToggleSearch}
            className="sf-modern-tools rounded-full px-1.5 py-1"
          />
        </div>
      </div>

      <div className="relative mx-auto -mt-20 max-w-6xl px-4 sm:-mt-24 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="sf-modern-card rounded-[28px] p-4 sm:p-6"
        >
          <div className="flex items-end gap-4">
            <div className="sf-modern-logo -mt-14 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[26px] sm:-mt-16 sm:h-28 sm:w-28">
              {profile.logo ? (
                <img src={profile.logo} alt="" decoding="async" className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-4xl font-black text-white">{businessName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="sf-modern-ink line-clamp-2 break-words text-2xl font-black leading-tight sm:text-3xl">
                {businessName}
              </h1>
              {profile.description && (
                <button
                  type="button"
                  onClick={onAbout}
                  className="sf-modern-muted mt-1 flex max-w-full items-center gap-1 text-start text-sm"
                >
                  <span className="line-clamp-1 min-w-0">{profile.description}</span>
                  <Icon name="chevronDown" className="h-3.5 w-3.5 shrink-0 -rotate-90 rtl:rotate-90" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <OpenStatus isOpen={isOpen} className="sf-modern-chip rounded-full px-3 py-1.5 text-xs font-bold" />
            {reviewsEnabled && reviewCount > 0 && (
              <span className="sf-modern-chip inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
                <Icon name="star" className="sf-modern-star h-3.5 w-3.5" />
                {avgRating.toFixed(1)}
                <span className="sf-modern-muted font-semibold">({reviewCount})</span>
              </span>
            )}
            {links.map((link) => {
              const className =
                'sf-modern-chip inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold'
              const content = (
                <>
                  <Icon name={link.icon} className="sf-modern-accent h-3.5 w-3.5 shrink-0" />
                  <span dir={link.ltr ? 'ltr' : undefined} className="truncate">
                    {link.label}
                  </span>
                </>
              )
              return link.href ? (
                <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className={`${className} sf-modern-chip-link`}>
                  {content}
                </a>
              ) : (
                <span key={link.key} className={className}>
                  {content}
                </span>
              )
            })}
          </div>

          {hasSocial && (
            <div className="sf-modern-divider mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <span className="sf-modern-muted text-xs font-bold">{t('public.modern.follow')}</span>
              <SocialLinks links={profile.socialLinks} />
            </div>
          )}
        </motion.div>
      </div>
    </header>
  )
}

export function ModernCategoryNav({ categories, activeId, onSelect }) {
  const barRef = useActiveTabInView(activeId)
  return (
    <nav className="sf-category-nav sf-modern-nav mt-5">
      <div ref={barRef} className="scrollbar-hide mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {categories.map((category) => {
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              type="button"
              data-category-id={category.id}
              onClick={() => onSelect(category.id)}
              aria-current={active ? 'true' : undefined}
              className={`sf-modern-bubble group flex w-[76px] shrink-0 flex-col items-center gap-1.5 ${active ? 'is-active' : ''}`}
            >
              <span className="sf-modern-ring block h-16 w-16 rounded-full p-[3px] transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                <span className="sf-modern-bubble-img flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                  {category.image ? (
                    <img loading="lazy" decoding="async" src={category.image} alt="" style={{ objectPosition: focusPosition(category.imageFocus) }} className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="image" className="h-6 w-6 opacity-50" />
                  )}
                </span>
              </span>
              <span className="sf-modern-bubble-name line-clamp-1 w-full text-center text-xs font-bold">
                {category.name}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function ModernCard({ item, onOpen, onQuickAdd }) {
  const { t } = useVerticalT()
  const { cover, focus, blocked, status, originalPrice, hasDiscount, discountPct } = itemState(item)
  return (
    <div className={`sf-modern-item group relative flex flex-col overflow-hidden rounded-[26px] ${blocked ? 'is-blocked' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={item.name}
        className="absolute inset-0 z-0 rounded-[26px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--merchant-primary)]"
      />
      <div className="sf-modern-photo pointer-events-none relative aspect-square overflow-hidden">
        {cover ? (
          <img
            loading="lazy"
            decoding="async"
            src={cover}
            alt=""
            style={{ objectPosition: focusPosition(focus) }}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${blocked ? 'opacity-60 grayscale' : ''}`}
          />
        ) : (
          <span className="sf-modern-placeholder absolute inset-0 flex items-center justify-center">
            <Icon name="image" className="h-10 w-10 opacity-60" />
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
        {(hasDiscount || status) && (
          <span className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1">
            {status && (
              <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                {status === 'unavailable' ? t('public.unavailable') : t('public.outOfStock')}
              </span>
            )}
            {hasDiscount && (
              <span className="sf-modern-discount rounded-full px-2 py-0.5 text-[11px] font-black text-white">
                <bdi dir="ltr">-{discountPct}%</bdi>
              </span>
            )}
          </span>
        )}
        <span className="sf-modern-price absolute bottom-2.5 start-2.5 rounded-full px-3 py-1 text-sm font-black backdrop-blur-md">
          <Price value={item.price} currency={item.currency} className="price-text tabular-nums" />
        </span>
      </div>

      <div className="pointer-events-none flex flex-1 flex-col gap-1 p-3 pe-14 sm:p-4 sm:pe-16">
        {item.brand && <p className="sf-modern-muted line-clamp-1 text-[10px] font-bold uppercase">{item.brand}</p>}
        <h4 className="sf-modern-ink line-clamp-2 text-sm font-extrabold leading-snug min-[380px]:text-[15px]">
          {item.name}
        </h4>
        {item.description && <p className="sf-modern-muted line-clamp-1 text-xs">{item.description}</p>}
        {hasDiscount && (
          <Price value={originalPrice} currency={item.currency} className="sf-modern-muted text-xs line-through tabular-nums" />
        )}
      </div>

      {!blocked && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onQuickAdd?.(item)
          }}
          aria-label={t('public.quickAdd', { name: item.name })}
          className="sf-modern-add accent-surface absolute bottom-3 end-3 z-10 flex h-10 w-10 items-center justify-center rounded-2xl text-white transition-transform hover:scale-110 active:scale-95"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function ModernMenu({ categories, onOpen, onQuickAdd }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <motion.section
          key={category.id}
          id={`category-${category.id}`}
          className="scroll-mt-40"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden="true" className="accent-surface h-7 w-1.5 rounded-full" />
            <h3 className="sf-modern-ink text-2xl font-black tracking-tight">{category.name}</h3>
            <span className="sf-modern-count rounded-full px-2.5 py-0.5 text-xs font-black">{category.items.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {category.items.map((item) => (
              <ModernCard key={item.id} item={item} onOpen={() => onOpen(item)} onQuickAdd={onQuickAdd} />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  )
}
