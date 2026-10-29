import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  DEFAULT_THRESHOLD,
  STORAGE_PROVIDERS,
  addRoute,
  buildWorkflow,
  isHttpUrl,
  isRepository,
  normalizeRoute,
  secretsSettingsUrl,
  storageConfig
} from './workflow.ts'

const options = overrides => ({
  base: 'https://unavatar.io',
  preview: { kind: 'vercel' },
  routes: ['/'],
  threshold: DEFAULT_THRESHOLD,
  useApiKey: true,
  ...overrides
})

describe('buildWorkflow', () => {
  test('matches the workflow documented in the README for the default answers', () => {
    assert.equal(buildWorkflow(options()), [
      'name: Visual diff',
      'on:',
      '  pull_request:',
      '    types: [opened, synchronize, reopened, closed]',
      '',
      'permissions:',
      '  pull-requests: write',
      '  deployments: read',
      '',
      'jobs:',
      '  visual-diff:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: microlinkhq/difftool@master',
      '        with:',
      '          base: https://unavatar.io',
      '          head: vercel',
      '          routes: |',
      "            - '/'",
      '          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}',
      '          s3-config: ${{ secrets.S3_CONFIG }}',
      ''
    ].join('\n'))
  })

  test('a fixed preview URL drops the deployments permission and trailing slashes', () => {
    const yaml = buildWorkflow(options({ base: 'https://example.com/', preview: { kind: 'url', url: 'https://preview.example.com//' } }))
    assert.match(yaml, /^ {10}base: https:\/\/example\.com$/m)
    assert.match(yaml, /^ {10}head: https:\/\/preview\.example\.com$/m)
    assert.doesNotMatch(yaml, /deployments: read/)
  })

  test('lists every route quoted and escapes single quotes', () => {
    const yaml = buildWorkflow(options({ routes: ['/', '/pricing', "/it's"] }))
    assert.match(yaml, / {12}- '\/'\n {12}- '\/pricing'\n {12}- '\/it''s'/)
  })

  test('falls back to the root route when none is given', () => {
    assert.match(buildWorkflow(options({ routes: [] })), / {12}- '\/'\n/)
  })

  test('writes the threshold only when it differs from the action default', () => {
    assert.doesNotMatch(buildWorkflow(options()), /threshold:/)
    assert.match(buildWorkflow(options({ threshold: 0.02 })), /^ {10}threshold: 0\.02$/m)
    assert.match(buildWorkflow(options({ threshold: 0.1 + 0.2 })), /^ {10}threshold: 0\.3$/m)
  })

  test('omits the Microlink key when the free tier is chosen', () => {
    assert.doesNotMatch(buildWorkflow(options({ useApiKey: false })), /microlink-api-key/)
  })
})

describe('routes', () => {
  test('normalizeRoute adds the leading slash and strips whitespace', () => {
    assert.equal(normalizeRoute(' pricing '), '/pricing')
    assert.equal(normalizeRoute('/docs/ api'), '/docs/api')
    assert.equal(normalizeRoute('   '), '')
  })

  test('addRoute ignores empty and duplicate routes', () => {
    assert.deepEqual(addRoute(['/'], 'blog'), ['/', '/blog'])
    assert.deepEqual(addRoute(['/', '/blog'], '/blog'), ['/', '/blog'])
    assert.deepEqual(addRoute(['/'], ' '), ['/'])
  })
})

describe('validation', () => {
  test('isHttpUrl accepts http(s) URLs with a real hostname only', () => {
    assert.equal(isHttpUrl('https://unavatar.io'), true)
    assert.equal(isHttpUrl('http://localhost.test:3000/a'), true)
    assert.equal(isHttpUrl('unavatar.io'), false)
    assert.equal(isHttpUrl('ftp://unavatar.io'), false)
    assert.equal(isHttpUrl('https://localhost'), false)
  })

  test('isRepository accepts owner/name only', () => {
    assert.equal(isRepository('microlinkhq/difftool'), true)
    assert.equal(isRepository(' microlinkhq/difftool '), true)
    assert.equal(isRepository('microlinkhq'), false)
    assert.equal(isRepository('https://github.com/microlinkhq/difftool'), false)
  })

  test('secretsSettingsUrl points at the new-secret page', () => {
    assert.equal(secretsSettingsUrl('microlinkhq/difftool'), 'https://github.com/microlinkhq/difftool/settings/secrets/actions/new')
  })
})

describe('storageConfig', () => {
  test('every provider has the keys the action requires', () => {
    for (const { id } of STORAGE_PROVIDERS) {
      const config = JSON.parse(storageConfig(id))
      for (const key of ['accessKeyId', 'secretAccessKey', 'bucket']) assert.ok(key in config, `${id} lacks ${key}`)
    }
  })

  test('R2 uses path-style addressing and the auto region', () => {
    const config = JSON.parse(storageConfig('r2'))
    assert.equal(config.region, 'auto')
    assert.equal(config.forcePathStyle, true)
  })
})
