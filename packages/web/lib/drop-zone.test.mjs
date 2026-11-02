import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { leavesZone } from './drop-zone.ts'

const zoneWith = children => ({ contains: node => children.includes(node) })

describe('drop zone', () => {
  test('moving onto a child keeps the highlight', () => {
    const chip = {}
    assert.equal(leavesZone(zoneWith([chip]), chip), false)
  })

  test('moving outside the zone, or out of the window, clears it', () => {
    assert.equal(leavesZone(zoneWith([]), {}), true)
    assert.equal(leavesZone(zoneWith([]), null), true)
  })
})
