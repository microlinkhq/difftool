import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  COPIED_FOR_MS,
  copyIconHidden,
  copyLabel,
  copyResetDelay,
  highlightSpans,
  reportCopy,
  scheduleCopyReset
} from './code-highlight.ts'

describe('highlightSpans', () => {
  test('yaml keys, hyphenated keys, list keys, and empty values', () => {
    assert.deepEqual(highlightSpans('name: Visual diff', 'yaml'), [
      { text: '', tone: 'plain' },
      { text: 'name', tone: 'key' },
      { text: ':', tone: 'punctuation' },
      { text: ' Visual diff', tone: 'value' }
    ])
    assert.deepEqual(
      highlightSpans('          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}', 'yaml').find(span => span.tone === 'key'),
      { text: 'microlink-api-key', tone: 'key' }
    )
    assert.deepEqual(highlightSpans('            - name: widget', 'yaml').find(span => span.tone === 'key'), {
      text: 'name',
      tone: 'key'
    })
    assert.equal(highlightSpans('            - name: widget', 'yaml')[0].text, '            - ')
    assert.deepEqual(highlightSpans('on:', 'yaml').find(span => span.tone === 'value'), { text: '', tone: 'value' })
    assert.deepEqual(highlightSpans("            - '/'", 'yaml'), [{ text: "            - '/'", tone: 'plain' }])
    assert.deepEqual(highlightSpans('', 'yaml'), [{ text: '', tone: 'plain' }])
  })

  test('json keys keep their quotes, including a hyphenated key', () => {
    assert.deepEqual(highlightSpans('  "forcePathStyle": true', 'json').find(span => span.tone === 'key'), {
      text: '"forcePathStyle"',
      tone: 'key'
    })
    assert.deepEqual(highlightSpans('  "microlink-api-key": "x"', 'json').find(span => span.tone === 'key'), {
      text: '"microlink-api-key"',
      tone: 'key'
    })
    assert.deepEqual(highlightSpans('name: Visual diff', 'json'), [{ text: 'name: Visual diff', tone: 'plain' }])
    assert.deepEqual(highlightSpans('{', 'json'), [{ text: '{', tone: 'plain' }])
  })
})

describe('copy', () => {
  test('a successful write is copied, a failed write is not', async () => {
    assert.equal(await reportCopy(async () => {}), true)
    assert.equal(await reportCopy(async () => { throw new Error('denied') }), false)
  })

  test('the button label, icon, and reset follow the copied flag', () => {
    assert.equal(copyLabel(true), 'Copied')
    assert.equal(copyLabel(false), 'Copy')
    assert.equal(copyIconHidden(true, 'check'), false)
    assert.equal(copyIconHidden(true, 'copy'), true)
    assert.equal(copyIconHidden(false, 'check'), true)
    assert.equal(copyIconHidden(false, 'copy'), false)
    assert.equal(copyResetDelay(true), COPIED_FOR_MS)
    assert.equal(copyResetDelay(false), undefined)
    let scheduled = 0
    scheduleCopyReset(false, () => {}, () => { scheduled++ })
    assert.equal(scheduled, 0)
    scheduleCopyReset(true, () => {}, (delay) => { scheduled = delay })
    assert.equal(scheduled, COPIED_FOR_MS)
  })
})
