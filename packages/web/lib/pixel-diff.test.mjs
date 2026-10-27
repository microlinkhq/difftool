import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { HIGHLIGHT_COLOR, highlightDifferences, subtractImages } from './pixel-diff.ts'

const pixels = (...rgba) => new Uint8ClampedArray(rgba.flat())
const TRANSPARENT = [0, 0, 0, 0]
const WHITE = [255, 255, 255, 255]
const BLACK = [0, 0, 0, 255]
const RED = [255, 0, 0, 255]

describe('highlightDifferences', () => {
  test('identical pixels keep the base image', () => {
    const base = pixels(WHITE, RED)
    assert.deepEqual(highlightDifferences(base, pixels(WHITE, RED)), base)
  })

  test('changed pixels turn into the highlight color, unchanged ones keep the base', () => {
    assert.deepEqual(highlightDifferences(pixels(WHITE, RED), pixels(WHITE, BLACK)), pixels(WHITE, HIGHLIGHT_COLOR))
  })

  test('padding against opaque black counts as a change, because alpha is compared too', () => {
    assert.deepEqual(highlightDifferences(pixels(TRANSPARENT), pixels(BLACK)), pixels(HIGHLIGHT_COLOR))
  })

  test('differences at or below the threshold are ignored', () => {
    const base = pixels([100, 100, 100, 255])
    assert.deepEqual(highlightDifferences(base, pixels([110, 110, 110, 255])), base)
    assert.deepEqual(highlightDifferences(base, pixels([111, 110, 110, 255])), pixels(HIGHLIGHT_COLOR))
  })

  test('does not mutate its inputs', () => {
    const base = pixels(RED)
    highlightDifferences(base, pixels(BLACK))
    assert.deepEqual(base, pixels(RED))
  })
})

describe('subtractImages', () => {
  test('identical pixels are opaque black', () => {
    assert.deepEqual(subtractImages(pixels(RED), pixels(RED)), pixels(BLACK))
  })

  test('padding against opaque black counts as a change', () => {
    assert.deepEqual(subtractImages(pixels(TRANSPARENT), pixels(BLACK)), pixels(WHITE))
  })

  test('channel differences are amplified and clamped', () => {
    assert.deepEqual(subtractImages(pixels([10, 0, 0, 255]), pixels([0, 0, 200, 255])), pixels([30, 0, 255, 255]))
  })
})
