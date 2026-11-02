import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { columnClass, verdictClass, verdictLabel } from './comment-table.ts'

describe('comment table', () => {
  test('wide columns hide below the sm breakpoint', () => {
    assert.equal(columnClass(true), 'hidden sm:table-cell')
    assert.equal(columnClass(false), '')
  })

  test('fail and pass each keep their own label and colour', () => {
    assert.equal(verdictLabel('fail'), 'Fail')
    assert.equal(verdictClass('fail'), 'text-destructive')
    assert.equal(verdictLabel('pass'), 'Pass')
    assert.equal(verdictClass('pass'), 'text-success')
  })
})
