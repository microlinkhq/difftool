import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { describe, test } from 'node:test'

import {
  DEFAULT_ROUTES,
  DEFAULT_VIEWPORT,
  VIEWPORT_LIMITS,
  VIEWPORT_HEIGHT_LIMITS,
  ZOOM_LIMITS,
  clampHeight,
  clampWidth,
  computeVerdict,
  fileLabel,
  isHttpUrl,
  isImageUrl,
  joinUrl,
  parseRoutes,
  parseZoom,
  pointerPercent,
  readQuery,
  stepZoom,
  writeQuery
} from '../web/lib.js'

describe('parseRoutes', () => {
  test('defaults to the root route for empty input', () => {
    assert.deepEqual(parseRoutes(''), DEFAULT_ROUTES)
    assert.deepEqual(parseRoutes(null), DEFAULT_ROUTES)
    assert.deepEqual(parseRoutes(' , \n '), DEFAULT_ROUTES)
  })

  test('splits on newlines and commas, adds the leading slash, dedupes', () => {
    assert.deepEqual(parseRoutes('/\nmarkdown, /pdf\n/pdf'), ['/', '/markdown', '/pdf'])
  })
})

describe('query round trip', () => {
  test('reads base, head, routes and width from the query string', () => {
    const query = readQuery('?base=https://microlink.io&head=http://localhost:8000&routes=/,/pdf&width=1280')
    assert.deepEqual(query, {
      base: 'https://microlink.io',
      head: 'http://localhost:8000',
      routes: ['/', '/pdf'],
      width: 1280
    })
  })

  test('falls back to defaults when params are missing', () => {
    assert.deepEqual(readQuery(''), { base: '', head: '', routes: DEFAULT_ROUTES, width: DEFAULT_VIEWPORT.width })
  })

  test('omits default routes and width when writing', () => {
    const search = writeQuery({ base: 'https://a.com', head: 'https://b.com', routes: DEFAULT_ROUTES, width: DEFAULT_VIEWPORT.width })
    assert.equal(search, '?base=https%3A%2F%2Fa.com&head=https%3A%2F%2Fb.com')
  })

  test('writes what it reads', () => {
    const query = { base: 'https://a.com', head: 'http://localhost:8000', routes: ['/', '/pricing'], width: 390 }
    assert.deepEqual(readQuery(writeQuery(query)), query)
  })
})

describe('clampWidth', () => {
  test('keeps the viewport inside the supported range', () => {
    assert.equal(clampWidth(10), VIEWPORT_LIMITS.min)
    assert.equal(clampWidth(99999), VIEWPORT_LIMITS.max)
    assert.equal(clampWidth('1280.4'), 1280)
    assert.equal(clampWidth('wide'), DEFAULT_VIEWPORT.width)
  })
})

describe('url helpers', () => {
  test('joinUrl normalizes slashes between origin and route', () => {
    assert.equal(joinUrl('https://a.com/', '/pdf'), 'https://a.com/pdf')
    assert.equal(joinUrl('https://a.com', 'pdf'), 'https://a.com/pdf')
  })

  test('isHttpUrl only accepts http and https', () => {
    assert.equal(isHttpUrl('http://localhost:8000'), true)
    assert.equal(isHttpUrl('https://microlink.io'), true)
    assert.equal(isHttpUrl('file:///etc/passwd'), false)
    assert.equal(isHttpUrl('javascript:alert(1)'), false)
    assert.equal(isHttpUrl('microlink.io'), false)
  })

  test('isImageUrl detects direct image links by pathname', () => {
    assert.equal(isImageUrl('https://iad.microlink.io/abc.png'), true)
    assert.equal(isImageUrl('https://cdn.example.com/shot.webp?v=2'), true)
    assert.equal(isImageUrl('https://microlink.io/png'), false)
  })
})

describe('computeVerdict', () => {
  test('passes, warns and fails around the thresholds', () => {
    assert.equal(computeVerdict(0.001, 0.001, 0.02), 'pass')
    assert.equal(computeVerdict(0.01, 0.001, 0.02), 'warning')
    assert.equal(computeVerdict(0.03, 0.001, 0.02), 'fail')
  })
})

describe('clampHeight', () => {
  test('keeps the viewport height inside the supported range', () => {
    assert.equal(clampHeight(-50), VIEWPORT_HEIGHT_LIMITS.min)
    assert.equal(clampHeight(1e9), VIEWPORT_HEIGHT_LIMITS.max)
    assert.equal(clampHeight('tall'), VIEWPORT_HEIGHT_LIMITS.default)
  })
})

describe('vendored pixelmatch', () => {
  test('matches the pixelmatch version the CLI uses', async () => {
    const require = createRequire(import.meta.url)
    const [vendored, installed] = await Promise.all([
      readFile(new URL('../web/vendor/pixelmatch.js', import.meta.url), 'utf8'),
      readFile(require.resolve('pixelmatch'), 'utf8')
    ])
    assert.equal(vendored, installed)
  })
})

describe('zoom', () => {
  test('parseZoom treats a missing or invalid value as fit', () => {
    for (const value of [null, undefined, '', 'big']) assert.equal(parseZoom(value), null, String(value))
  })

  test('parseZoom clamps to the supported range', () => {
    assert.equal(parseZoom('75'), 75)
    assert.equal(parseZoom('1'), ZOOM_LIMITS.min)
    assert.equal(parseZoom('9000'), ZOOM_LIMITS.max)
  })

  test('stepZoom snaps to the step grid in the direction of travel', () => {
    assert.equal(stepZoom(100, 1), 125)
    assert.equal(stepZoom(100, -1), 75)
    assert.equal(stepZoom(37.4, 1), 50)
    assert.equal(stepZoom(37.4, -1), 25)
  })

  test('stepZoom never leaves the supported range', () => {
    assert.equal(stepZoom(ZOOM_LIMITS.min, -1), ZOOM_LIMITS.min)
    assert.equal(stepZoom(ZOOM_LIMITS.max, 1), ZOOM_LIMITS.max)
  })
})

describe('pointerPercent', () => {
  const rect = { left: 100, width: 400 }

  test('maps a pointer x position to a percentage of the element', () => {
    assert.equal(pointerPercent(100, rect), 0)
    assert.equal(pointerPercent(300, rect), 50)
    assert.equal(pointerPercent(500, rect), 100)
  })

  test('clamps outside the element and survives a zero width', () => {
    assert.equal(pointerPercent(0, rect), 0)
    assert.equal(pointerPercent(900, rect), 100)
    assert.equal(pointerPercent(10, { left: 0, width: 0 }), 0)
  })
})

describe('fileLabel', () => {
  test('names an image by the last path segment, without the signature', () => {
    assert.equal(fileLabel('https://bucket.r2.cloudflarestorage.com/a/pr-1/sha/root-base.png?X-Amz-Signature=abc'), 'root-base.png')
    assert.equal(fileLabel('https://cdn.example.com/my%20shot.png'), 'my shot.png')
  })

  test('falls back to the input when it is not a url with a file name', () => {
    assert.equal(fileLabel('https://example.com/'), 'https://example.com/')
    assert.equal(fileLabel('not a url'), 'not a url')
  })
})
