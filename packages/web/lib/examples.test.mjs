import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { EXAMPLE_IMAGES } from './site.ts'
import { EXAMPLE_WIDTH_PX, SAFARI_CANVAS_MAX_PIXELS } from './zoom.ts'

const publicFile = urlPath => new URL(`../public${urlPath}`, import.meta.url)

const readUint24 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)

const webpSize = bytes => {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  const chunk = bytes.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') return { width: readUint24(bytes, 24) + 1, height: readUint24(bytes, 27) + 1 }
  throw new Error(`unknown WebP chunk ${chunk}`)
}

const exampleSizes = Object.values(EXAMPLE_IMAGES).map(urlPath => webpSize(readFileSync(publicFile(urlPath))))

describe('example images', () => {
  test('are exported at the width the demo zoom is fitted to', () => {
    for (const { width } of exampleSizes) assert.equal(width, EXAMPLE_WIDTH_PX)
  })

  test('are full pages, not a first screen', () => {
    for (const { width, height } of exampleSizes) assert.ok(height > width * 2, `${width}x${height}`)
  })

  test('fit the canvas Safari allows, so highlight and subtract work on iPhone', () => {
    for (const { width, height } of exampleSizes) assert.ok(width * height <= SAFARI_CANVAS_MAX_PIXELS, `${width}x${height}`)
  })
})
