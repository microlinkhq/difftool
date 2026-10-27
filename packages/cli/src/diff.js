import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const decode = buffer => PNG.sync.read(buffer)

const padToHeight = (png, height) => {
  if (png.height === height) return png
  const padded = new PNG({ width: png.width, height })
  png.data.copy(padded.data, 0, 0, png.data.length)
  return padded
}

const padToWidth = (png, width) => {
  if (png.width === width) return png
  const padded = new PNG({ width, height: png.height })
  for (let y = 0; y < png.height; y++) {
    const srcStart = y * png.width * 4
    const dstStart = y * width * 4
    png.data.copy(padded.data, dstStart, srcStart, srcStart + png.width * 4)
  }
  return padded
}

export const diff = (baseBuffer, headBuffer, { pixelThreshold = 0.1 } = {}) => {
  let base = decode(baseBuffer)
  let head = decode(headBuffer)

  const width = Math.max(base.width, head.width)
  const height = Math.max(base.height, head.height)

  base = padToHeight(padToWidth(base, width), height)
  head = padToHeight(padToWidth(head, width), height)

  const diffPng = new PNG({ width, height })
  const diffPixels = pixelmatch(base.data, head.data, diffPng.data, width, height, {
    threshold: pixelThreshold,
    includeAA: false,
    alpha: 0.3,
    diffColor: [255, 0, 0]
  })

  return {
    base,
    head,
    diffPng,
    diffBuffer: PNG.sync.write(diffPng),
    basePadded: PNG.sync.write(base),
    headPadded: PNG.sync.write(head),
    diffPixels,
    totalPixels: width * height,
    width,
    height
  }
}
