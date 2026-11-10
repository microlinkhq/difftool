export const DEFAULT_ZOOM = 50
export const MIN_ZOOM = 10
export const MAX_DEMO_ZOOM = 60
export const EXAMPLE_WIDTH_PX = 1280
export const SAFARI_CANVAS_MAX_PIXELS = 4096 * 4096
export const FRAME_PADDING_PX = 32

export const resolveInitialZoom = (initialZoom = DEFAULT_ZOOM) => initialZoom

export const fitZoom = (frameWidth: number, imageWidth = EXAMPLE_WIDTH_PX, maxZoom = MAX_DEMO_ZOOM) =>
  Math.min(
    maxZoom,
    Math.max(MIN_ZOOM, Math.floor(((frameWidth - FRAME_PADDING_PX) / imageWidth) * 100))
  )

export const zoomForViewport = (viewportWidth: number, imageWidth: number) =>
  imageWidth > 0 ? fitZoom(viewportWidth, imageWidth, DEFAULT_ZOOM) : DEFAULT_ZOOM

export const frameWidth = (element: { clientWidth: number } | null) => element?.clientWidth

export const zoomForFrame = (clientWidth?: number | null) =>
  fitZoom(clientWidth ?? EXAMPLE_WIDTH_PX)
