import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

const BODY_TEXT_RATIO = 4.5
const DISTINCT_HUE_DEGREES = 15

const VERCEL_THEME = new Set([
  'oklch(0.99 0 0)', 'oklch(1 0 0)', 'oklch(0 0 0)', 'oklch(0.94 0 0)', 'oklch(0.97 0 0)', 'oklch(0.44 0 0)',
  'oklch(0.92 0 0)', 'oklch(0.25 0 0)', 'oklch(0.63 0.19 23.03)', 'oklch(0.55 0.22 264.53)'
])

const OUTSIDE_THEME = new Set(['#c48472', '#087f5b'])

const CONTRAST_FIXES = new Set(['oklch(0.57 0.19 23.03)'])

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
const declared = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))

const resolve = name => {
  const value = declared[name]
  assert.ok(value, `--${name} is not declared in :root`)
  const reference = value.match(/^var\(--([\w-]+)\)$/)
  return reference ? resolve(reference[1]) : value
}

const isColorLiteral = value => /^#[0-9a-f]{3,6}$/i.test(value) || value.startsWith('oklch(')

const oklchParts = value => value.match(/^oklch\(([^)]+)\)$/)[1].trim().split(/\s+/).map(Number)

const hexToLinear = hex => {
  const digits = hex.replace('#', '')
  const full = digits.length === 3 ? [...digits].map(d => d + d).join('') : digits
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
}

const linearToOklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

const oklabToLinear = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map(c => Math.min(1, Math.max(0, c)))
}

const oklab = value => {
  if (value.startsWith('#')) return linearToOklab(hexToLinear(value))
  const [L, C, H] = oklchParts(value)
  const radians = (H * Math.PI) / 180
  return [L, C * Math.cos(radians), C * Math.sin(radians)]
}

const luminance = value => {
  const [r, g, b] = oklabToLinear(oklab(value))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const ACHROMATIC_CHROMA = 0.02
const chroma = value => Math.hypot(...oklab(value).slice(1))
const hue = value => {
  const [, a, b] = oklab(value)
  return (Math.atan2(b, a) * 180) / Math.PI
}
const hueGap = (a, b) => {
  const gap = Math.abs(hue(a) - hue(b)) % 360
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
  ['cta-foreground', 'cta'],
  ['cta-foreground', 'cta-hover'],
  ['active-foreground', 'active'],
  ['cta', 'card'],
  ['cta', 'muted'],
  ['destructive', 'card'],
  ['destructive', 'muted'],
  ['success', 'card'],
  ['link', 'card'],
  ['link-hover', 'card'],
  ['primary', 'card'],
  ['primary', 'muted'],
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

  test('the brand accent keeps one meaning: a hued brand sits at least 15° from every status color', () => {
    const brand = resolve('brand')
    if (chroma(brand) < ACHROMATIC_CHROMA) return
    for (const status of ['destructive', 'success', 'link', 'code-value']) {
      const gap = hueGap(brand, resolve(status))
      assert.ok(gap >= DISTINCT_HUE_DEGREES, `--${status} is ${gap.toFixed(1)}° from --brand`)
    }
  })

  test('every color literal comes from the Vercel theme, the painting, or a named exception', () => {
    const literals = Object.values(declared).filter(isColorLiteral)
    assert.ok(literals.length > 0)
    for (const value of literals) {
      assert.ok(VERCEL_THEME.has(value) || OUTSIDE_THEME.has(value) || CONTRAST_FIXES.has(value), `${value} is not a Vercel theme color`)
    }
  })

  test('a contrast fix only lowers the lightness of a Vercel theme color', () => {
    for (const fix of CONTRAST_FIXES) {
      const [L, C, H] = oklchParts(fix)
      const source = [...VERCEL_THEME].map(oklchParts).find(([, c, h]) => c === C && h === H)
      assert.ok(source, `${fix} shares no chroma and hue with the theme`)
      assert.ok(L < source[0], `${fix} is not darker than its theme color`)
    }
  })
})
