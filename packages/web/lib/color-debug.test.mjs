import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { COLOR_GROUPS, COLOR_TOKENS, changedTokens, cssVariable, overridesCss, toHex } from './color-debug.ts'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))

describe('color debug panel', () => {
  test('every token the panel edits is declared in :root', () => {
    for (const token of COLOR_TOKENS) assert.ok(rootBlock.includes(`${cssVariable(token)}:`), `${cssVariable(token)} is not in :root`)
  })

  test('no token appears in two groups', () => {
    assert.equal(new Set(COLOR_TOKENS).size, COLOR_TOKENS.length)
    assert.ok(Object.keys(COLOR_GROUPS).length > 0)
  })

  test('toHex expands short hex and lowercases', () => {
    assert.equal(toHex(' #FFF '), '#ffffff')
    assert.equal(toHex('#9D4612'), '#9d4612')
  })

  test('changedTokens ignores case and short-hex differences', () => {
    const initial = { primary: '#9d4612', background: '#fff' }
    assert.deepEqual(changedTokens(initial, { primary: '#9D4612', background: '#ffffff' }), [])
    assert.deepEqual(changedTokens(initial, { primary: '#123456', background: '#ffffff' }), ['primary'])
  })

  test('overridesCss prints only the changed tokens as a :root block', () => {
    const initial = { primary: '#9d4612', 'ink-panel': '#3d2012', background: '#fff' }
    const current = { primary: '#AA5522', 'ink-panel': '#3d2012', background: '#fff' }
    assert.equal(overridesCss(initial, current), ':root {\n  --primary: #aa5522;\n}\n')
  })

  test('overridesCss is empty when nothing changed', () => {
    assert.equal(overridesCss({ primary: '#9d4612' }, { primary: '#9d4612' }), '')
  })
})
