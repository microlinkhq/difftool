import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { EXAMPLE_WIDTH_PX, fitZoom, frameWidth, resolveInitialZoom, zoomForFrame } from './zoom.ts'

describe('zoom', () => {
  test('omitted zoom is the default, and zero stays zero', () => {
    assert.equal(resolveInitialZoom(), 50)
    assert.equal(resolveInitialZoom(25), 25)
    assert.equal(resolveInitialZoom(0), 0)
  })

  test('the demo fits the frame, caps at 60, and never goes below the slider minimum', () => {
    assert.equal(fitZoom(392), 25)
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
