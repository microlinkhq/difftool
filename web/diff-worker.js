import { PIXELMATCH_OPTIONS } from './lib.js'
import pixelmatch from './vendor/pixelmatch.js'

self.onmessage = ({ data: { id, base, head, width, height, pixelThreshold } }) => {
  try {
    const output = new Uint8ClampedArray(width * height * 4)
    const diffPixels = pixelmatch(base, head, output, width, height, {
      ...PIXELMATCH_OPTIONS,
      threshold: pixelThreshold
    })
    self.postMessage({ id, output, diffPixels }, [output.buffer])
  } catch (error) {
    self.postMessage({ id, error: error.message })
  }
}
