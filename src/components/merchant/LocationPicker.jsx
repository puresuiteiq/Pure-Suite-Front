import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'

// No default centre before the merchant has picked one — Erbil, since that's
// where this platform's own merchants operate (their phone numbers are all
// +964). Just a sane starting viewport, not a guess at any one merchant's
// actual location.
const DEFAULT_CENTER = [36.191, 44.009]
const DEFAULT_ZOOM = 12
const PIN_ZOOM = 16

/**
 * A custom SVG pin (not Leaflet's default marker images) in the merchant's
 * own accent colour — Leaflet's default icon PNGs resolve to broken relative
 * paths under Vite's bundler, and a divIcon sidesteps that entirely while
 * also keeping the pin on-brand instead of a generic blue teardrop.
 */
function pinIcon() {
  return L.divIcon({
    className: 'location-picker-pin',
    html: `<svg viewBox="0 0 24 32" width="36" height="48" style="filter: drop-shadow(0 6px 10px rgb(0 0 0 / .35))">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12Z" fill="var(--primary-color, #16a34a)" />
      <circle cx="12" cy="12" r="5" fill="#fff" />
    </svg>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  })
}

/**
 * Draggable-pin map for picking the restaurant's exact location. Free
 * OpenStreetMap tiles — no API key or billing needed. Reports
 * `{ latitude, longitude }` via `onChange` on every drag/click/geolocate;
 * the caller (MerchantProfile) owns saving it with the rest of the form.
 */
export default function LocationPicker({ value, onChange }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [locating, setLocating] = useState(false)

  // Init once. `value` on mount seeds the starting pin position; later
  // changes to `value` (e.g. the profile finishing its own async load) are
  // applied via the effect below rather than re-running this one, so the map
  // itself is never torn down and rebuilt.
  useEffect(() => {
    const hasValue = value?.latitude != null && value?.longitude != null
    const start = hasValue ? [value.latitude, value.longitude] : DEFAULT_CENTER

    const map = L.map(containerRef.current, {
      center: start,
      zoom: hasValue ? PIN_ZOOM : DEFAULT_ZOOM,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    // OpenStreetMap refuses tile requests with no Referer, so the policy is set
    // on the tiles themselves rather than trusting the page's header to allow it.
    // The {s} subdomains are deprecated by OSM.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      referrerPolicy: 'strict-origin-when-cross-origin',
    }).addTo(map)

    const marker = L.marker(start, { icon: pinIcon(), draggable: true }).addTo(map)
    markerRef.current = marker

    const report = (latlng) => onChangeRef.current({ latitude: latlng.lat, longitude: latlng.lng })
    marker.on('dragend', () => report(marker.getLatLng()))
    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      report(e.latlng)
    })

    // Leaflet measures its container on init; inside a freshly-opened form
    // section that can happen before layout settles, leaving the map
    // partially blank until the next resize. A one-tick invalidateSize fixes it.
    const id = window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      window.clearTimeout(id)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init-once by design; see comment above
  }, [])

  // Keep the pin in sync if `value` changes from outside a drag/click of its
  // own (e.g. the async profile load resolving after the map already mounted).
  useEffect(() => {
    if (value?.latitude == null || value?.longitude == null) return
    const marker = markerRef.current
    if (!marker) return
    const current = marker.getLatLng()
    if (current.lat === value.latitude && current.lng === value.longitude) return
    marker.setLatLng([value.latitude, value.longitude])
  }, [value?.latitude, value?.longitude])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        markerRef.current?.setLatLng(latlng)
        mapRef.current?.setView(latlng, PIN_ZOOM)
        onChange({ latitude: latlng.lat, longitude: latlng.lng })
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{t('profile.locationHint')}</p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
        >
          <Icon name="mapPin" className="h-3.5 w-3.5" />
          {locating ? t('common.working') : t('profile.useCurrentLocation')}
        </button>
      </div>
      {value?.latitude != null && value?.longitude != null && (
        <output className="mt-2 block font-mono text-xs text-slate-400">
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </output>
      )}
    </div>
  )
}
