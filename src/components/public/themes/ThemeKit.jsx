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
 * The theme kit: the parts most storefront designs are assembled from.
 *
 * A design (config/storefrontThemes.js → KIT_LAYOUTS) picks one header, one
 * category navigation and one item layout from here; its own CSS
 * (index.css, .sf-theme-<key>, on top of the shared .sf-kit rules) gives it
 * its colours, type, shapes and ornament. The markup is deliberately plain and
 * class-named (sf-kit-*) so that CSS can turn the same card into a glass
 * panel, a sticker-shadowed block or a circular plate.
 */

const EASE = [0.22, 1, 0.36, 1]

/** The store's logo, or its initial. Frame shape comes from the theme's CSS. */
function Logo({ profile, businessName, className = '' }) {
  return (
    <div className={`sf-kit-logo flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      {profile.logo ? (
        <img src={profile.logo} alt="" decoding="async" className="h-full w-full object-contain p-1.5" />
      ) : (
        <span className="sf-kit-display text-3xl font-bold">{businessName.charAt(0)}</span>
      )}
    </div>
  )
}

/** Open/closed, rating, phone and address as chips. */
function MetaChips({ profile, reviewsEnabled, reviewCount, avgRating, isOpen, withStatus = true, className = '' }) {
  return (
    <div className={`sf-kit-meta flex flex-wrap gap-2 ${className}`}>
      {withStatus && <OpenStatus isOpen={isOpen} className="sf-kit-chip" />}
      {reviewsEnabled && reviewCount > 0 && (
        <span className="sf-kit-chip">
          <Icon name="star" className="sf-kit-star h-3.5 w-3.5" />
          {avgRating.toFixed(1)}
          <span className="sf-kit-muted font-semibold">({reviewCount})</span>
        </span>
      )}
      {contactLinks(profile).map((link) => {
        const content = (
          <>
            <Icon name={link.icon} className="sf-kit-accent h-3.5 w-3.5 shrink-0" />
            <span dir={link.ltr ? 'ltr' : undefined} className="truncate">
              {link.label}
            </span>
          </>
        )
        return link.href ? (
          <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className="sf-kit-chip sf-kit-chip-link min-w-0 max-w-full">
            {content}
          </a>
        ) : (
          <span key={link.key} className="sf-kit-chip min-w-0 max-w-full">
            {content}
          </span>
        )
      })}
    </div>
  )
}

function Description({ profile, onAbout, className = '' }) {
  if (!profile.description) return null
  return (
    <button type="button" onClick={onAbout} className={`sf-kit-desc line-clamp-2 text-sm leading-relaxed sm:text-base ${className}`}>
      {profile.description}
    </button>
  )
}

function useRise() {
  const reduceMotion = useReducedMotion()
  return (delay) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.65, ease: EASE } }
}

/* ── Headers ──────────────────────────────────────────────────────────── */

/** Centred: logo, kicker, name, a flourish, then the details. */
function CenterHeader(props) {
  const { profile, businessName, isOpen, searchOpen, onToggleSearch, onAbout } = props
  const { t } = useVerticalT()
  const rise = useRise()
  const hasSocial = Object.values(profile.socialLinks || {}).some(Boolean)
  return (
    <header className="sf-header sf-kit-header sf-kit-center relative overflow-hidden">
      <span aria-hidden="true" className="sf-kit-deco pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-4xl px-5 pb-10 pt-4 text-center sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <OpenStatus isOpen={isOpen} className="sf-kit-status text-xs font-semibold" />
          <StorefrontTools searchOpen={searchOpen} onToggleSearch={onToggleSearch} />
        </div>
        <motion.div {...rise(0.05)} className="mt-6 flex justify-center">
          <Logo profile={profile} businessName={businessName} className="h-24 w-24 sm:h-28 sm:w-28" />
        </motion.div>
        <motion.p {...rise(0.14)} className="sf-kit-kicker mt-5 text-xs font-bold sm:text-sm">
          {t('public.kit.kicker')}
        </motion.p>
        <motion.h1 {...rise(0.2)} className="sf-kit-display sf-kit-title mt-1 break-words text-4xl font-bold leading-tight sm:text-5xl">
          {businessName}
        </motion.h1>
        <motion.span {...rise(0.28)} aria-hidden="true" className="sf-kit-flourish mx-auto mt-4 block" />
        <motion.div {...rise(0.34)}>
          <Description profile={profile} onAbout={onAbout} className="mx-auto mt-4 max-w-xl" />
        </motion.div>
        <motion.div {...rise(0.42)}>
          <MetaChips {...props} withStatus={false} className="mt-5 justify-center" />
        </motion.div>
        {hasSocial && (
          <motion.div {...rise(0.5)}>
            <SocialLinks links={profile.socialLinks} className="mt-5 justify-center" />
          </motion.div>
        )}
      </div>
    </header>
  )
}

/** Split: logo beside a large name, the details underneath. */
function SplitHeader(props) {
  const { profile, businessName, isOpen, searchOpen, onToggleSearch, onAbout } = props
  const { t } = useVerticalT()
  const rise = useRise()
  const hasSocial = Object.values(profile.socialLinks || {}).some(Boolean)
  return (
    <header className="sf-header sf-kit-header sf-kit-split relative">
      <div className="mx-auto max-w-6xl px-4 pb-7 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <OpenStatus isOpen={isOpen} className="sf-kit-status text-xs font-semibold" />
          <StorefrontTools searchOpen={searchOpen} onToggleSearch={onToggleSearch} />
        </div>
        <motion.div {...rise(0.05)} className="sf-kit-split-card mt-5 flex items-center gap-4 sm:gap-6">
          <Logo profile={profile} businessName={businessName} className="h-20 w-20 sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1">
            <p className="sf-kit-kicker text-xs font-bold">{t('public.kit.kicker')}</p>
            <h1 className="sf-kit-display sf-kit-title mt-0.5 break-words text-3xl font-black leading-[1.1] sm:text-5xl">
              {businessName}
            </h1>
            <Description profile={profile} onAbout={onAbout} className="mt-2 text-start" />
          </div>
        </motion.div>
        <motion.div {...rise(0.16)}>
          <MetaChips {...props} withStatus={false} className="mt-5" />
        </motion.div>
        {hasSocial && (
          <motion.div {...rise(0.24)} className="sf-kit-social-row mt-5 flex items-center justify-between gap-3 pt-4">
            <span className="sf-kit-muted text-xs font-bold">{t('public.modern.follow')}</span>
            <SocialLinks links={profile.socialLinks} />
          </motion.div>
        )}
      </div>
    </header>
  )
}

/** Cover: a decorative band the logo and name sit over. */
function CoverHeader(props) {
  const { profile, businessName, isOpen, searchOpen, onToggleSearch, onAbout } = props
  const rise = useRise()
  const hasSocial = Object.values(profile.socialLinks || {}).some(Boolean)
  return (
    <header className="sf-header sf-kit-header sf-kit-cover relative overflow-hidden">
      <span aria-hidden="true" className="sf-kit-cover-art pointer-events-none absolute inset-x-0 top-0 h-64" />
      <div className="relative mx-auto max-w-4xl px-5 pb-9 pt-4 text-center sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <OpenStatus isOpen={isOpen} className="sf-kit-status text-xs font-semibold" />
          <StorefrontTools searchOpen={searchOpen} onToggleSearch={onToggleSearch} />
        </div>
        <motion.div {...rise(0.05)} className="mt-10 flex justify-center">
          <Logo profile={profile} businessName={businessName} className="h-24 w-24 sm:h-28 sm:w-28" />
        </motion.div>
        <motion.h1 {...rise(0.16)} className="sf-kit-display sf-kit-title mt-6 break-words text-4xl font-black leading-tight sm:text-6xl">
          {businessName}
        </motion.h1>
        <motion.div {...rise(0.26)}>
          <Description profile={profile} onAbout={onAbout} className="mx-auto mt-3 max-w-xl" />
        </motion.div>
        <motion.div {...rise(0.34)}>
          <MetaChips {...props} withStatus={false} className="mt-5 justify-center" />
        </motion.div>
        {hasSocial && (
          <motion.div {...rise(0.42)}>
            <SocialLinks links={profile.socialLinks} className="mt-5 justify-center" />
          </motion.div>
        )}
      </div>
    </header>
  )
}

/** Hero: a full-bleed photograph with the name set over it. */
function HeroHeader(props) {
  const { profile, businessName, isOpen, searchOpen, onToggleSearch, onAbout, heroImage } = props
  const { t } = useVerticalT()
  const rise = useRise()
  const hasSocial = Object.values(profile.socialLinks || {}).some(Boolean)
  return (
    <header className="sf-header sf-kit-header sf-kit-hero relative">
      <div className="relative h-[64vh] max-h-[640px] min-h-[400px] overflow-hidden">
        {heroImage ? (
          <motion.img
            src={heroImage}
            alt=""
            decoding="async"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: EASE }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="true" className="sf-kit-hero-fallback absolute inset-0" />
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-6xl items-center justify-between gap-3 p-4 sm:px-6">
          <OpenStatus isOpen={isOpen} className="sf-kit-chip sf-kit-on-photo" />
          <StorefrontTools searchOpen={searchOpen} onToggleSearch={onToggleSearch} className="sf-kit-glass-tools rounded-full px-1.5 py-1" />
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8 text-white sm:px-8">
          <motion.div {...rise(0.1)} className="flex items-center gap-3">
            <Logo profile={profile} businessName={businessName} className="h-12 w-12" />
            <p className="sf-kit-hero-kicker text-xs font-bold sm:text-sm">{t('public.kit.today')}</p>
          </motion.div>
          <motion.h1 {...rise(0.2)} className="sf-kit-display mt-3 break-words text-5xl font-bold leading-[1.05] sm:text-7xl">
            {businessName}
          </motion.h1>
          {profile.description && (
            <motion.button
              {...rise(0.3)}
              type="button"
              onClick={onAbout}
              className="mt-3 line-clamp-2 max-w-2xl text-start text-sm text-white/80 sm:text-base"
            >
              {profile.description}
            </motion.button>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <MetaChips {...props} withStatus={false} />
        {hasSocial && <SocialLinks links={profile.socialLinks} />}
      </div>
    </header>
  )
}

const HEADERS = { center: CenterHeader, split: SplitHeader, cover: CoverHeader, hero: HeroHeader }

export function KitHeader(props) {
  const Header = HEADERS[props.layout?.header] ?? CenterHeader
  return <Header {...props} />
}

/* ── Category navigation ──────────────────────────────────────────────── */

export function KitCategoryNav({ categories, activeId, onSelect, layout }) {
  const barRef = useActiveTabInView(activeId)
  return (
    <nav className={`sf-category-nav sf-kit-nav sf-kit-nav-${layout?.nav ?? 'pills'}`}>
      <div ref={barRef} className="scrollbar-hide mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {categories.map((category, index) => {
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              type="button"
              data-category-id={category.id}
              onClick={() => onSelect(category.id)}
              aria-current={active ? 'true' : undefined}
              className={`sf-kit-navitem sf-kit-display relative shrink-0 whitespace-nowrap ${active ? 'is-active' : ''}`}
            >
              {layout?.numbered && <span className="sf-kit-navnum">{String(index + 1).padStart(2, '0')}</span>}
              {category.name}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ── Items ────────────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const { t } = useVerticalT()
  if (!status) return null
  return (
    <span className="sf-kit-status-badge rounded-full px-2 py-0.5 text-[11px] font-bold">
      {status === 'unavailable' ? t('public.unavailable') : t('public.outOfStock')}
    </span>
  )
}

function Photo({ cover, focus, blocked, className = '' }) {
  return (
    <div className={`sf-kit-photo relative overflow-hidden ${className}`}>
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
        <span className="sf-kit-placeholder absolute inset-0 flex items-center justify-center">
          <Icon name="image" className="h-8 w-8 opacity-60" />
        </span>
      )}
    </div>
  )
}

function AddButton({ item, onQuickAdd, className = '' }) {
  const { t } = useVerticalT()
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onQuickAdd?.(item)
      }}
      aria-label={t('public.quickAdd', { name: item.name })}
      className={`sf-kit-add pointer-events-auto absolute z-10 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${className}`}
    >
      <Icon name="plus" className="h-5 w-5" />
    </button>
  )
}

function OpenTarget({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={item.name}
      className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--merchant-primary)]"
    />
  )
}

/** Row: text first, a square photo at the end. */
function KitRow({ item, onOpen, onQuickAdd }) {
  const { cover, focus, blocked, status, originalPrice, hasDiscount, discountPct } = itemState(item)
  return (
    <div className={`sf-kit-row group relative flex items-center gap-4 ${blocked ? 'is-blocked' : ''}`}>
      <OpenTarget item={item} onOpen={onOpen} />
      <div className="pointer-events-none relative min-w-0 flex-1">
        {item.brand && <p className="sf-kit-muted text-[11px] font-bold">{item.brand}</p>}
        <h4 className="sf-kit-display sf-kit-item-name line-clamp-2 text-base font-bold leading-snug sm:text-lg">{item.name}</h4>
        {item.description && <p className="sf-kit-muted mt-1 line-clamp-2 text-sm leading-relaxed">{item.description}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Price value={item.price} currency={item.currency} className="price-text sf-kit-price text-base font-extrabold tabular-nums" />
          {hasDiscount && <Price value={originalPrice} currency={item.currency} className="sf-kit-muted text-xs line-through tabular-nums" />}
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="sf-kit-row-media pointer-events-none relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
        <Photo cover={cover} focus={focus} blocked={blocked} className="h-full w-full" />
        {hasDiscount && (
          <span className="sf-kit-discount absolute start-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black">
            <bdi dir="ltr">-{discountPct}%</bdi>
          </span>
        )}
        {!blocked && <AddButton item={item} onQuickAdd={onQuickAdd} />}
      </div>
    </div>
  )
}

/** Card: photo on top, text underneath. */
function KitCard({ item, onOpen, onQuickAdd }) {
  const { cover, focus, blocked, status, originalPrice, hasDiscount, discountPct } = itemState(item)
  return (
    <div className={`sf-kit-card group relative flex flex-col ${blocked ? 'is-blocked' : ''}`}>
      <OpenTarget item={item} onOpen={onOpen} />
      <div className="sf-kit-card-media pointer-events-none relative">
        <Photo cover={cover} focus={focus} blocked={blocked} />
        {(hasDiscount || status) && (
          <span className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1">
            <StatusBadge status={status} />
            {hasDiscount && (
              <span className="sf-kit-discount rounded-full px-2 py-0.5 text-[11px] font-black">
                <bdi dir="ltr">-{discountPct}%</bdi>
              </span>
            )}
          </span>
        )}
        <span className="sf-kit-price-tag absolute">
          <Price value={item.price} currency={item.currency} className="price-text tabular-nums" />
        </span>
      </div>
      <div className="sf-kit-card-body pointer-events-none flex flex-1 flex-col gap-1">
        {item.brand && <p className="sf-kit-muted line-clamp-1 text-[10px] font-bold uppercase">{item.brand}</p>}
        <h4 className="sf-kit-display sf-kit-item-name line-clamp-2 text-sm font-bold leading-snug min-[380px]:text-[15px]">{item.name}</h4>
        {item.description && <p className="sf-kit-muted line-clamp-1 text-xs">{item.description}</p>}
        <span className="sf-kit-body-price flex flex-wrap items-baseline gap-x-2">
          <Price value={item.price} currency={item.currency} className="price-text text-sm font-extrabold tabular-nums" />
          {hasDiscount && <Price value={originalPrice} currency={item.currency} className="sf-kit-muted text-xs line-through tabular-nums" />}
        </span>
        {hasDiscount && (
          <Price value={originalPrice} currency={item.currency} className="sf-kit-card-was sf-kit-muted text-xs line-through tabular-nums" />
        )}
      </div>
      {!blocked && <AddButton item={item} onQuickAdd={onQuickAdd} />}
    </div>
  )
}

/** Feature: the first item of a section, set large (magazine). */
function KitFeature({ item, onOpen, onQuickAdd }) {
  const { t } = useVerticalT()
  const { cover, focus, blocked, status, originalPrice, hasDiscount, discountPct } = itemState(item)
  return (
    <div className={`sf-kit-feature group relative grid items-center gap-5 md:grid-cols-2 md:gap-8 ${blocked ? 'is-blocked' : ''}`}>
      <OpenTarget item={item} onOpen={onOpen} />
      <div className="pointer-events-none relative">
        <Photo cover={cover} focus={focus} blocked={blocked} className="sf-kit-feature-photo" />
        {hasDiscount && (
          <span className="sf-kit-discount absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-black">
            <bdi dir="ltr">-{discountPct}%</bdi>
          </span>
        )}
      </div>
      <div className="pointer-events-none relative">
        <p className="sf-kit-kicker text-xs font-bold">{t('public.kit.featured')}</p>
        <h4 className="sf-kit-display sf-kit-item-name mt-1 text-3xl font-bold leading-tight sm:text-4xl">{item.name}</h4>
        {item.description && <p className="sf-kit-muted mt-3 line-clamp-3 leading-relaxed">{item.description}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Price value={item.price} currency={item.currency} className="price-text text-2xl font-extrabold tabular-nums" />
          {hasDiscount && <Price value={originalPrice} currency={item.currency} className="sf-kit-muted line-through tabular-nums" />}
          <StatusBadge status={status} />
          {!blocked && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onQuickAdd?.(item)
              }}
              className="sf-kit-add-text pointer-events-auto relative z-10 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            >
              <Icon name="plus" className="h-4 w-4" />
              {t('public.add')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ category, index, numbered }) {
  return (
    <div className="sf-kit-section-head mb-6 flex items-end gap-3">
      {numbered && <span className="sf-kit-section-num sf-kit-display">{String(index + 1).padStart(2, '0')}</span>}
      <h3 className="sf-kit-display sf-kit-section-title text-2xl font-bold leading-tight sm:text-3xl">{category.name}</h3>
      <span aria-hidden="true" className="sf-kit-section-rule mb-2.5 flex-1" />
      <span className="sf-kit-section-count mb-1.5 text-xs font-bold">{category.items.length}</span>
    </div>
  )
}

export function KitMenu({ categories, onOpen, onQuickAdd, layout }) {
  const reduceMotion = useReducedMotion()
  const items = layout?.items ?? 'card'
  const cards = (list) => (
    <div className="sf-kit-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {list.map((item) => (
        <KitCard key={item.id} item={item} onOpen={() => onOpen(item)} onQuickAdd={onQuickAdd} />
      ))}
    </div>
  )
  return (
    <div className="sf-kit-menu space-y-14">
      {categories.map((category, index) => {
        const [lead, ...rest] = category.items
        return (
          <motion.section
            key={category.id}
            id={`category-${category.id}`}
            className="scroll-mt-32"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <SectionHead category={category} index={index} numbered={layout?.numbered} />
            {items === 'row' ? (
              <div className="sf-kit-rows grid grid-cols-1 gap-x-10 md:grid-cols-2">
                {category.items.map((item) => (
                  <KitRow key={item.id} item={item} onOpen={() => onOpen(item)} onQuickAdd={onQuickAdd} />
                ))}
              </div>
            ) : items === 'editorial' ? (
              <div className="space-y-10">
                <KitFeature item={lead} onOpen={() => onOpen(lead)} onQuickAdd={onQuickAdd} />
                {rest.length > 0 && cards(rest)}
              </div>
            ) : (
              cards(category.items)
            )}
          </motion.section>
        )
      })}
    </div>
  )
}
