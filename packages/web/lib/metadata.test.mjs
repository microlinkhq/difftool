import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

import { DESCRIPTION, MANIFEST_ICONS, TITLE, TITLE_TEMPLATE, jsonLdScript, manifest, structuredData } from './metadata.ts'
import { SITE_URL } from './site.ts'

const MAX_SNIPPET_CHARS = 160
const MAX_TITLE_CHARS = 60
const webRoot = new URL('../', import.meta.url)

const pngSize = (path) => {
  const bytes = readFileSync(new URL(path, webRoot))
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${path} is not a PNG`)
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
}

const icoSizes = (path) => {
  const bytes = readFileSync(new URL(path, webRoot))
  assert.equal(bytes.readUInt16LE(2), 1, `${path} is not an icon file`)
  return Array.from({ length: bytes.readUInt16LE(4) }, (_, index) => bytes[6 + index * 16] || 256)
}

describe('title and description', () => {
  test('fit in a search result without being cut off', () => {
    assert.ok(TITLE.length <= MAX_TITLE_CHARS, `title is ${TITLE.length} chars`)
    assert.ok(DESCRIPTION.length <= MAX_SNIPPET_CHARS, `description is ${DESCRIPTION.length} chars`)
  })

  test('child pages are suffixed with the site name', () => {
    assert.equal(TITLE_TEMPLATE.replace('%s', 'Page not found'), 'Page not found · difftool')
  })
})

describe('icons', () => {
  test('every manifest icon exists at the size it declares', () => {
    for (const icon of MANIFEST_ICONS) {
      assert.equal(pngSize(`public${icon.src}`), icon.sizes)
    }
  })

  test('the manifest offers a maskable icon and an any-purpose icon', () => {
    const purposes = new Set(manifest().icons.map((icon) => icon.purpose))
    assert.ok(purposes.has('any'))
    assert.ok(purposes.has('maskable'))
  })

  test('the apple touch icon is 180px and the favicon carries 16, 32 and 48px frames', () => {
    assert.equal(pngSize('app/apple-icon.png'), '180x180')
    assert.deepEqual(icoSizes('app/favicon.ico'), [16, 32, 48])
  })

  test('the svg icon keeps the crop the icon generator expects', () => {
    const svg = readFileSync(new URL('app/icon.svg', webRoot), 'utf8')
    const script = readFileSync(new URL('scripts/generate-icons.sh', webRoot), 'utf8')
    const [, viewBox] = script.match(/TIGHT_VIEWBOX='([^']+)'/)
    assert.ok(svg.includes(`viewBox="${viewBox}"`))
  })
})

describe('structured data', () => {
  test('describes the page it is rendered on', () => {
    const data = structuredData()
    assert.equal(data['@type'], 'WebApplication')
    assert.equal(data.url, SITE_URL)
    assert.equal(data.description, DESCRIPTION)
    assert.equal(data.isAccessibleForFree, true)
    assert.equal('offers' in data, false)
    assert.equal('aggregateRating' in data, false)
  })

  test('cannot close its script tag early', () => {
    const script = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    assert.doesNotMatch(script, /</)
    assert.deepEqual(JSON.parse(script), { name: '</script><script>alert(1)</script>' })
  })
})
