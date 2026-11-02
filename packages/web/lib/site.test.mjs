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

  test('a modified or middle click opens the link elsewhere', () => {
    for (const modifier of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      let prevented = 0
      let ran = 0
      followExample({ preventDefault: () => { prevented++ }, ...modifier }, () => { ran++ })
      assert.equal(prevented, 0, JSON.stringify(modifier))
      assert.equal(ran, 0, JSON.stringify(modifier))
    }
  })
})
