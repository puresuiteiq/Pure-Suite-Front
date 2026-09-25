const COORD = '(-?\\d+(?:\\.\\d+)?)'
const COORD_PAIR_RE = new RegExp(`${COORD}\\s*,\\s*${COORD}`)

function coordinates(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { latitude: lat, longitude: lng }
}

function fromPair(value) {
  if (!value) return null
  const match = String(value).match(COORD_PAIR_RE)
  return match ? coordinates(match[1], match[2]) : null
}

export function parseMapCoordinates(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  let url
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  for (const key of ['q', 'query', 'll', 'center', 'destination', 'daddr']) {
    const found = fromPair(url.searchParams.get(key))
    if (found) return found
  }

  const mlat = url.searchParams.get('mlat')
  const mlon = url.searchParams.get('mlon')
  if (mlat != null && mlon != null) {
    const found = coordinates(mlat, mlon)
    if (found) return found
  }

  const decoded = decodeURIComponent(url.href)
  const at = decoded.match(new RegExp(`@${COORD}\\s*,\\s*${COORD}`))
  if (at) return coordinates(at[1], at[2])

  const bang = decoded.match(new RegExp(`!3d${COORD}!4d${COORD}`))
  if (bang) return coordinates(bang[1], bang[2])

  const osm = decoded.match(new RegExp(`#map=\\d+(?:\\.\\d+)?/${COORD}/${COORD}`))
  if (osm) return coordinates(osm[1], osm[2])

  return fromPair(decoded)
}

export function isShortMapLink(raw) {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase()
    return host === 'maps.app.goo.gl' || host === 'goo.gl' || host.endsWith('.goo.gl')
  } catch {
    return false
  }
}
