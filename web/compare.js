import { DEFAULT_PIXEL_THRESHOLD } from './lib.js'

const pending = new Map()
let nextId = 0
let worker = null

const rejectPending = message => {
  for (const { reject } of pending.values()) reject(new Error(message))
  pending.clear()
}

const getWorker = () => {
  if (worker) return worker
  worker = new Worker(new URL('./diff-worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    const entry = pending.get(data.id)
    if (!entry) return
    pending.delete(data.id)
    data.error ? entry.reject(new Error(`Pixel diff failed: ${data.error}`)) : entry.resolve(data)
  }
  worker.onerror = event => {
    event.preventDefault()
    worker.terminate()
    worker = null
    rejectPending(`Pixel diff worker crashed${event.message ? `: ${event.message}` : ''}`)
  }
  worker.onmessageerror = () => rejectPending('Pixel diff worker could not read the images')
  return worker
}

const runWorker = message =>
  new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...message, id }, [message.base.buffer, message.head.buffer])
  })

const pixelsOf = (bitmap, width, height) => {
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0)
  return context.getImageData(0, 0, width, height).data
}

const toBlob = async (pixels, width, height) => {
  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
  return canvas.convertToBlob({ type: 'image/png' })
}

export const diffImages = async (baseBlob, headBlob, { pixelThreshold = DEFAULT_PIXEL_THRESHOLD } = {}) => {
  const [base, head] = await Promise.all([createImageBitmap(baseBlob), createImageBitmap(headBlob)])
  const width = Math.max(base.width, head.width)
  const height = Math.max(base.height, head.height)
  const baseSize = { width: base.width, height: base.height }
  const headSize = { width: head.width, height: head.height }
  try {
    const { output, diffPixels } = await runWorker({
      base: pixelsOf(base, width, height),
      head: pixelsOf(head, width, height),
      width,
      height,
      pixelThreshold
    })
    return {
      width,
      height,
      baseSize,
      headSize,
      diffPixels,
      totalPixels: width * height,
      diffBlob: await toBlob(output, width, height)
    }
  } finally {
    base.close()
    head.close()
  }
}
