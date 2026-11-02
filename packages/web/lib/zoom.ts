export const DEFAULT_ZOOM = 50
export const MIN_ZOOM = 10
export const MAX_DEMO_ZOOM = 60
export const EXAMPLE_WIDTH_PX = 1440
export const FRAME_PADDING_PX = 32

export const resolveInitialZoom = (initialZoom = DEFAULT_ZOOM) => initialZoom

export const fitZoom = (frameWidth: number) =>
  Math.min(
    MAX_DEMO_ZOOM,
    Math.max(MIN_ZOOM, Math.floor(((frameWidth - FRAME_PADDING_PX) / EXAMPLE_WIDTH_PX) * 100))
  )

export const frameWidth = (element: { clientWidth: number } | null) => element?.clientWidth

export const zoomForFrame = (clientWidth?: number | null) =>
  fitZoom(clientWidth ?? EXAMPLE_WIDTH_PX)
