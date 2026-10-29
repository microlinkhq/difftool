import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { optionSelected, segmentButtonClass, segmentLayout } from './segment-layout.ts'

describe('segmentLayout', () => {
  test('two, three and four options each have a layout, and any other count uses the two-option layout', () => {
    assert.equal(segmentLayout(2), 'grid-flow-col auto-cols-fr')
    assert.equal(segmentLayout(3), 'grid-cols-1 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr')
    assert.equal(segmentLayout(4), 'grid-cols-2 sm:grid-cols-4')
    assert.equal(segmentLayout(1), segmentLayout(2))
    assert.equal(segmentLayout(5), segmentLayout(2))
  })

  test('the selected option is the one whose value matches', () => {
    assert.equal(optionSelected('url', 'url'), true)
    assert.equal(optionSelected('vercel', 'url'), false)
    assert.equal(optionSelected(0.01, 0.01), true)
    assert.equal(optionSelected(0.01, 0.03), false)
    assert.match(segmentButtonClass(true), /bg-background/)
    assert.match(segmentButtonClass(false), /text-muted-foreground/)
    assert.doesNotMatch(segmentButtonClass(false), /bg-background/)
  })
})
