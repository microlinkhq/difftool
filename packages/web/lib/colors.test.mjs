import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

const BODY_TEXT_RATIO = 4.5
const DISTINCT_HUE_DEGREES = 15

const MICROLINK_COLORS = new Set([
  '#000', '#fff', '#0473e4', '#015cba', '#d92d6e', '#f76698', '#c03fa2', '#8c1bab',
  '#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529',
  '#c92a2a', '#087f5b', '#ffec99'
])

const RENOIR_COLORS = new Set(['#9d4612', '#b05829', '#3d2012', '#4d3021'])

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
const declared = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))

const resolve = name => {
  const value = declared[name]
  assert.ok(value, `--${name} is not declared in :root`)
  const reference = value.match(/^var\(--([\w-]+)\)$/)
  return reference ? resolve(reference[1]) : value
}

const channels = hex => {
  const digits = hex.replace('#', '')
  const full = digits.length === 3 ? [...digits].map(d => d + d).join('') : digits
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
}
const linear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = hex => {
  const [r, g, b] = channels(hex).map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
const oklchHue = hex => {
  const [r, g, b] = channels(hex).map(linear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return (Math.atan2(bAxis, a) * 180) / Math.PI
}
const hueGap = (a, b) => {
  const gap = Math.abs(oklchHue(a) - oklchHue(b)) % 360
  return Math.min(gap, 360 - gap)
}

const TEXT_PAIRS = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'surface-hover'],
  ['primary-foreground', 'primary'],
  ['primary-foreground', 'primary-hover'],
  ['destructive', 'card'],
  ['destructive', 'muted'],
  ['success', 'card'],
  ['link', 'card'],
  ['link-hover', 'card'],
  ['ink-panel-foreground', 'ink-panel'],
  ['ink-panel-foreground', 'ink-panel-raised'],
  ['ink-panel-muted', 'ink-panel'],
  ['ink-panel-muted', 'ink-panel-raised'],
  ['code-plain', 'ink-panel'],
  ['code-punctuation', 'ink-panel'],
  ['code-value', 'ink-panel']
]

describe('color tokens', () => {
  for (const [text, surface] of TEXT_PAIRS) {
    test(`--${text} on --${surface} reaches ${BODY_TEXT_RATIO}:1`, () => {
      const ratio = contrast(resolve(text), resolve(surface))
      assert.ok(ratio >= BODY_TEXT_RATIO, `${ratio.toFixed(2)}:1`)
    })
  }

  test('the brand accent keeps one meaning: status colors sit at least 15° away', () => {
    for (const status of ['destructive', 'success', 'link', 'code-value']) {
      const gap = hueGap(resolve('brand'), resolve(status))
      assert.ok(gap >= DISTINCT_HUE_DEGREES, `--${status} is ${gap.toFixed(1)}° from --brand`)
    }
  })

  test('every color primitive comes from microlink.io\'s theme or the hero painting', () => {
    const primitives = Object.values(declared).filter(value => /^#[0-9a-f]{3,6}$/i.test(value))
    assert.ok(primitives.length > 0)
    for (const hex of primitives) assert.ok(MICROLINK_COLORS.has(hex.toLowerCase()) || RENOIR_COLORS.has(hex.toLowerCase()), `${hex} is in neither microlink.io's theme nor the painting`)
  })
})
