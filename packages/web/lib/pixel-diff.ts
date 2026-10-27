export const HIGHLIGHT_THRESHOLD = 30
export const HIGHLIGHT_COLOR = [255, 0, 128, 180]
export const SUBTRACT_AMPLIFY = 3

const channelDistance = (base: Uint8ClampedArray, head: Uint8ClampedArray, i: number, channels: number) => {
  let distance = 0
  for (let c = 0; c < channels; c++) distance += Math.abs(base[i + c] - head[i + c])
  return distance
}

export function highlightDifferences(base: Uint8ClampedArray, head: Uint8ClampedArray) {
  const output = new Uint8ClampedArray(base)
  for (let i = 0; i < base.length; i += 4) {
    if (channelDistance(base, head, i, 4) > HIGHLIGHT_THRESHOLD) output.set(HIGHLIGHT_COLOR, i)
  }
  return output
}

export function subtractImages(base: Uint8ClampedArray, head: Uint8ClampedArray) {
  const output = new Uint8ClampedArray(base.length)
  for (let i = 0; i < base.length; i += 4) {
    const alphaDistance = Math.abs(base[i + 3] - head[i + 3])
    for (let c = 0; c < 3; c++) {
      output[i + c] = Math.max(Math.abs(base[i + c] - head[i + c]), alphaDistance) * SUBTRACT_AMPLIFY
    }
    output[i + 3] = 255
  }
  return output
}

const hasSize = (image: HTMLImageElement) => image.naturalWidth > 0 && image.naturalHeight > 0

const canvasHolds = (ctx: CanvasRenderingContext2D) => {
  ctx.fillRect(0, 0, 1, 1)
  return ctx.getImageData(0, 0, 1, 1).data[3] === 255
}

export function readPixelPair(ctx: CanvasRenderingContext2D, base: HTMLImageElement, head: HTMLImageElement) {
  if (!hasSize(base) || !hasSize(head)) throw new Error("An image has no intrinsic size")
  const width = Math.max(base.naturalWidth, head.naturalWidth)
  const height = Math.max(base.naturalHeight, head.naturalHeight)
  ctx.canvas.width = width
  ctx.canvas.height = height
  if (!canvasHolds(ctx)) throw new Error(`Canvas cannot hold ${width}x${height}`)
  const read = (image: HTMLImageElement) => {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0)
    return ctx.getImageData(0, 0, width, height).data
  }
  return { width, height, base: read(base), head: read(head) }
}
