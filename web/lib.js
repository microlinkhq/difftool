export const DEFAULT_THRESHOLD = 0.001
export const DEFAULT_WARNING_THRESHOLD = 0.02
export const DEFAULT_PIXEL_THRESHOLD = 0.1
export const DEFAULT_ROUTES = ['/']
export const DEFAULT_VIEWPORT = { width: 1440, height: 900 }
export const VIEWPORT_LIMITS = { min: 320, max: 3840 }
export const VIEWPORT_HEIGHT_LIMITS = { min: 200, max: 2160, default: DEFAULT_VIEWPORT.height }
export const PIXELMATCH_OPTIONS = { includeAA: false, alpha: 0.3, diffColor: [255, 0, 0] }
export const WAIT_FOR_TIMEOUT = 3000

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif|avif)$/i

export const computeVerdict = (ratio, threshold, warningThreshold) => {
  if (ratio <= threshold) return 'pass'
  if (ratio <= warningThreshold) return 'warning'
  return 'fail'
}

export const joinUrl = (origin, route) => {
  const base = origin.replace(/\/+$/, '')
  const suffix = route.startsWith('/') ? route : `/${route}`
  return `${base}${suffix}`
}

export const parseRoutes = value => {
  const routes = String(value ?? '')
    .split(/[\n,]/)
    .map(route => route.trim())
    .filter(Boolean)
    .map(route => (route.startsWith('/') ? route : `/${route}`))
  return routes.length > 0 ? [...new Set(routes)] : DEFAULT_ROUTES
}

export const clampWidth = value => {
  const width = Math.round(Number(value))
  if (!Number.isFinite(width)) return DEFAULT_VIEWPORT.width
  return Math.min(VIEWPORT_LIMITS.max, Math.max(VIEWPORT_LIMITS.min, width))
}

export const clampHeight = value => {
  const height = Math.round(Number(value))
  if (!Number.isFinite(height)) return VIEWPORT_HEIGHT_LIMITS.default
  return Math.min(VIEWPORT_HEIGHT_LIMITS.max, Math.max(VIEWPORT_HEIGHT_LIMITS.min, height))
}

export const isHttpUrl = value => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const isImageUrl = value =>
  isHttpUrl(value) && IMAGE_EXTENSION.test(new URL(value).pathname)

export const readQuery = search => {
  const params = new URLSearchParams(search)
  return {
    base: params.get('base')?.trim() ?? '',
    head: params.get('head')?.trim() ?? '',
    routes: parseRoutes(params.get('routes')),
    width: clampWidth(params.get('width') ?? DEFAULT_VIEWPORT.width)
  }
}

export const writeQuery = ({ base, head, routes, width }) => {
  const params = new URLSearchParams({ base, head })
  if (routes.join(',') !== DEFAULT_ROUTES.join(',')) params.set('routes', routes.join(','))
  if (width !== DEFAULT_VIEWPORT.width) params.set('width', String(width))
  return `?${params}`
}

export const toPercent = ratio => `${(ratio * 100).toFixed(2)}%`
