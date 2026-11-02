import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  COPIED_FOR_MS,
  TONE_CLASS,
  copyIconHidden,
  copyLabel,
  copyResetDelay,
  copyState,
  highlightSpans,
  reportCopy,
  scheduleCopyReset
} from './code-highlight.ts'

describe('highlightSpans', () => {
  test('yaml keys, hyphenated keys, list keys, and empty values', () => {
    assert.deepEqual(highlightSpans('name: Visual diff', 'yaml'), [
      { text: '', tone: 'inherit' },
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
    assert.equal(TONE_CLASS.inherit, '')
    assert.equal(TONE_CLASS.plain, 'text-code-plain')
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

  test('a write result becomes copied or failed', () => {
    assert.equal(copyState(true), 'copied')
    assert.equal(copyState(false), 'failed')
  })

  test('the button label, icon, and reset follow the copy state', () => {
    assert.equal(copyLabel('idle'), 'Copy')
    assert.equal(copyLabel('idle', 'Copy prompt'), 'Copy prompt')
    assert.equal(copyLabel('copied', 'Copy prompt'), 'Copied')
    assert.equal(copyLabel('failed', 'Copy prompt'), 'Copy failed')
    assert.equal(copyIconHidden('copied', 'check'), false)
    assert.equal(copyIconHidden('copied', 'copy'), true)
    assert.equal(copyIconHidden('failed', 'check'), true)
    assert.equal(copyIconHidden('failed', 'copy'), false)
    assert.equal(copyIconHidden('idle', 'check'), true)
    assert.equal(copyResetDelay('copied'), COPIED_FOR_MS)
    assert.equal(copyResetDelay('failed'), COPIED_FOR_MS)
    assert.equal(copyResetDelay('idle'), undefined)
    let scheduled = 0
    scheduleCopyReset('idle', () => {}, () => { scheduled++ })
    assert.equal(scheduled, 0)
    scheduleCopyReset('failed', () => {}, (delay) => { scheduled = delay })
    assert.equal(scheduled, COPIED_FOR_MS)
  })
})
