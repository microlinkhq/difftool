import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { followExample } from './site.ts'

describe('followExample', () => {
  test('without a handler the link navigates', () => {
    let prevented = 0
    followExample({ preventDefault: () => { prevented++ } })
    assert.equal(prevented, 0)
  })

  test('with a handler the click stays on the page and runs it', () => {
    let prevented = 0
    let ran = 0
    followExample({ preventDefault: () => { prevented++ } }, () => { ran++ })
    assert.equal(prevented, 1)
    assert.equal(ran, 1)
  })
})
