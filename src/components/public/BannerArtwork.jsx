/**
 * Caption sizing per context. `responsive` is the storefront itself; `phone`
 * pins the storefront's phone sizing, for a preview framed at phone width on a
 * desktop screen, where the responsive `sm:` sizes would otherwise kick in;
 * `compact` is for thumbnails.
 */
const CAPTION = {
  responsive: { box: 'px-5 pb-9 pt-16 sm:px-6', text: 'text-xl sm:text-2xl' },
  phone: { box: 'px-5 pb-9 pt-16', text: 'text-xl' },
  compact: { box: 'px-3 pb-2.5 pt-8', text: 'text-sm' },
}

/**
 * One merchant banner, filling its positioned parent — the parent decides the
 * shape. Shared by the storefront carousel and the Banners page previews, so a
 * merchant previews the real rendering rather than an approximation of it.
 *
 * The picture is shown whole (object-contain) over a blurred, enlarged copy of
 * itself. Merchants upload what they have — a square Instagram post, a wide
 * flyer — and cropping to fill (object-cover) cut the text off the edges of
 * exactly those. The blurred copy fills the space left over, so a picture of
 * another shape still reads as edge-to-edge rather than letterboxed.
 *
 * `backdrop` can be switched off for slides nobody can see: a large CSS blur is
 * expensive on the low-end phones this runs on, and the carousel stacks every
 * slide on top of each other.
 */
export default function BannerArtwork({ src, title, eager = false, backdrop = true, size = 'responsive' }) {
  const loading = eager ? 'eager' : 'lazy'
  const caption = CAPTION[size] ?? CAPTION.responsive
  return (
    <>
      {backdrop && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading={loading}
          decoding="async"
          draggable="false"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-2xl"
        />
      )}
      <img
        src={src}
        alt=""
        loading={loading}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        draggable="false"
        className="absolute inset-0 h-full w-full object-contain"
      />
      {title && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent ${caption.box}`}
        >
          <p className={`line-clamp-2 font-bold text-white ${caption.text}`}>{title}</p>
        </div>
      )}
    </>
  )
}
