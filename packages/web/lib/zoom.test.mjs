import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { EXAMPLE_WIDTH_PX, FRAME_PADDING_PX, fitZoom, frameWidth, resolveInitialZoom, zoomForFrame, zoomForViewport } from './zoom.ts'

describe('zoom', () => {
  test('omitted zoom is the default, and zero stays zero', () => {
    assert.equal(resolveInitialZoom(), 50)
    assert.equal(resolveInitialZoom(25), 25)
    assert.equal(resolveInitialZoom(0), 0)
  })

  test('the demo fits the frame, caps at 60, and never goes below the slider minimum', () => {
    assert.equal(fitZoom(392), 28)
    assert.equal(fitZoom(10_000), 60)
    assert.equal(fitZoom(0), 10)
  })

  test('a missing frame width uses the example width, and a zero width does not', () => {
    assert.equal(zoomForFrame(undefined), fitZoom(EXAMPLE_WIDTH_PX))
    assert.equal(zoomForFrame(null), fitZoom(EXAMPLE_WIDTH_PX))
    assert.equal(zoomForFrame(0), fitZoom(0))
    assert.equal(frameWidth(null), undefined)
    assert.equal(frameWidth({ clientWidth: 392 }), 392)
  })
})

describe('compare view zoom', () => {
  test('a phone fits a 1440px screenshot instead of opening it at the 50% default', () => {
    assert.equal(zoomForViewport(375, 1440), 23)
    assert.ok((zoomForViewport(375, 1440) / 100) * 1440 <= 375 - FRAME_PADDING_PX)
  })

  test('a wide screen keeps the 50% default, and a small image is never blown up past it', () => {
    assert.equal(zoomForViewport(1440, 1440), 50)
    assert.equal(zoomForViewport(375, 200), 50)
  })

  test('an image whose width cannot be read falls back to the default, and tiny viewports clamp to the minimum', () => {
    assert.equal(zoomForViewport(375, 0), 50)
    assert.equal(zoomForViewport(40, 4000), 10)
  })
})
