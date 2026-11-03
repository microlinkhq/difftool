import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { columnClass, verdictClass, verdictDotClass, verdictLabel } from './comment-table.ts'

describe('comment table', () => {
  test('wide columns hide below the sm breakpoint', () => {
    assert.equal(columnClass(true), 'hidden sm:table-cell')
    assert.equal(columnClass(false), '')
  })

  test('every verdict the CLI emits keeps its own label and colour', () => {
    assert.equal(verdictLabel('fail'), 'Fail')
    assert.equal(verdictClass('fail'), 'text-destructive')
    assert.equal(verdictDotClass('fail'), 'bg-destructive')
    assert.equal(verdictLabel('warning'), 'Warning')
    assert.equal(verdictClass('warning'), 'text-warning')
    assert.equal(verdictDotClass('warning'), 'bg-warning')
    assert.equal(verdictLabel('pass'), 'Pass')
    assert.equal(verdictClass('pass'), 'text-success')
    assert.equal(verdictDotClass('pass'), 'bg-success')
  })
})
