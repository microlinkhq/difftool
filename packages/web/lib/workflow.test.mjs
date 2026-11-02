import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  DEFAULT_THRESHOLD,
  addRoute,
  buildInstallPrompt,
  buildWorkflow,
  commitOnEnter,
  formatPercent,
  isHttpUrl,
  isPreviewValid,
  isRepository,
  normalizeRoute,
  previewInput,
  removeRouteDisabled,
  secretsHref,
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
    assert.match(buildWorkflow(options({ threshold: 0.01 })), /^ {10}threshold: 0\.01$/m)
    assert.match(buildWorkflow(options({ threshold: 0.03 })), /^ {10}threshold: 0\.03$/m)
    assert.match(buildWorkflow(options({ threshold: 0.1 + 0.2 })), /^ {10}threshold: 0\.3$/m)
  })

  test('keeps a fragment on the production URL', () => {
    const yaml = buildWorkflow(options({ base: 'https://example.com/docs#install' }))
    assert.match(yaml, /^ {10}base: https:\/\/example\.com\/docs#install$/m)
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

  test('addRoute returns the same list when nothing new is added', () => {
    const routes = ['/', '/blog']
    assert.equal(addRoute(routes, ' '), routes)
    assert.equal(addRoute(routes, 'blog'), routes)
    assert.notEqual(addRoute(routes, '/docs'), routes)
  })

  test('the last route cannot be removed', () => {
    assert.equal(removeRouteDisabled(1), true)
    assert.equal(removeRouteDisabled(2), false)
  })

  test('enter commits the draft and other keys do not', () => {
    let committed = 0
    let prevented = 0
    const event = key => ({ key, preventDefault: () => { prevented++ } })
    commitOnEnter(event('a'), () => { committed++ })
    assert.equal(committed, 0)
    assert.equal(prevented, 0)
    commitOnEnter(event('Enter'), () => { committed++ })
    assert.equal(committed, 1)
    assert.equal(prevented, 1)
  })
})

describe('validation', () => {
  test('isHttpUrl accepts http(s) URLs with a real hostname only', () => {
    assert.equal(isHttpUrl('https://unavatar.io'), true)
    assert.equal(isHttpUrl('http://localhost.test:3000/a'), true)
    assert.equal(isHttpUrl(' https://unavatar.io '), true)
    assert.equal(isHttpUrl('https://example.com/docs#install'), true)
    assert.equal(isHttpUrl('unavatar.io'), false)
    assert.equal(isHttpUrl('ftp://unavatar.io'), false)
    assert.equal(isHttpUrl('https://localhost'), false)
    assert.equal(isHttpUrl('   '), false)
  })

  test('a Vercel preview does not need a URL, a fixed preview does', () => {
    assert.equal(isPreviewValid('vercel', ''), true)
    assert.equal(isPreviewValid('vercel', 'not a url'), true)
    assert.equal(isPreviewValid('url', 'https://preview.example.com'), true)
    assert.equal(isPreviewValid('url', ''), false)
    assert.equal(isPreviewValid('url', 'ftp://preview.example.com'), false)
    assert.deepEqual(previewInput('vercel', 'https://ignored.example'), { kind: 'vercel' })
    assert.deepEqual(previewInput('url', 'https://preview.example.com'), { kind: 'url', url: 'https://preview.example.com' })
  })

  test('isRepository accepts owner/name only', () => {
    assert.equal(isRepository('microlinkhq/difftool'), true)
    assert.equal(isRepository(' microlinkhq/difftool '), true)
    assert.equal(isRepository('my-org/app.io'), true)
    assert.equal(isRepository('my.org/app-name'), true)
    assert.equal(isRepository('microlinkhq'), false)
    assert.equal(isRepository('https://github.com/microlinkhq/difftool'), false)
  })

  test('secretsSettingsUrl points at the new-secret page', () => {
    const url = 'https://github.com/microlinkhq/difftool/settings/secrets/actions/new'
    assert.equal(secretsSettingsUrl('microlinkhq/difftool'), url)
    assert.equal(secretsSettingsUrl(' microlinkhq/difftool '), url)
    assert.equal(secretsHref('microlinkhq/difftool'), url)
    assert.equal(secretsHref(' my-org/app.io '), 'https://github.com/my-org/app.io/settings/secrets/actions/new')
    assert.equal(secretsHref('not a repo'), undefined)
  })

  test('formatPercent prints the wizard presets', () => {
    assert.equal(formatPercent(0.001), '0.1%')
    assert.equal(formatPercent(0.01), '1%')
    assert.equal(formatPercent(0.03), '3%')
  })
})

describe('storageConfig', () => {
  test('each provider is the documented template', () => {
    assert.deepEqual(JSON.parse(storageConfig('r2')), {
      endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucket: 'difftool-assets',
      forcePathStyle: true
    })
    assert.deepEqual(JSON.parse(storageConfig('aws')), {
      region: 'us-east-1',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucket: 'difftool-assets'
    })
    assert.deepEqual(JSON.parse(storageConfig('b2')), {
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucket: 'difftool-assets',
      forcePathStyle: true
    })
    assert.deepEqual(JSON.parse(storageConfig('minio')), {
      endpoint: 'https://minio.example.com',
      region: 'us-east-1',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucket: 'difftool-assets',
      forcePathStyle: true
    })
  })
})

describe('install prompt', () => {
  const answers = {
    base: 'https://example.com',
    preview: { kind: 'vercel' },
    routes: ['/', '/pricing'],
    threshold: DEFAULT_THRESHOLD,
    useApiKey: true,
    provider: 'r2',
    repository: 'acme/site',
    docsUrl: 'https://github.com/microlinkhq/difftool#github-action',
    dashboardUrl: 'https://dashboard.microlink.io'
  }

  test('carries the exact workflow the wizard shows', () => {
    const prompt = buildInstallPrompt(answers)
    assert.ok(prompt.includes(`\`\`\`yaml\n${buildWorkflow(answers)}\`\`\``))
    assert.ok(prompt.includes('.github/workflows/visual-diff.yml'))
  })

  test('names both secrets, the chosen bucket shape and where to add them', () => {
    const prompt = buildInstallPrompt(answers)
    assert.ok(prompt.includes('`S3_CONFIG`: the Cloudflare R2 bucket'))
    assert.ok(prompt.includes('r2.cloudflarestorage.com'))
    assert.ok(prompt.includes('`MICROLINK_API_KEY`: a Microlink API key, from https://dashboard.microlink.io'))
    assert.ok(prompt.includes('https://github.com/acme/site/settings/secrets/actions/new'))
    assert.ok(prompt.includes('Never write secret values into a file or a commit'))
  })

  test('without an API key it explains the free tier and asks for no key', () => {
    const prompt = buildInstallPrompt({ ...answers, useApiKey: false })
    assert.ok(!prompt.includes('MICROLINK_API_KEY'))
    assert.ok(prompt.includes('free endpoint, 5 requests a day'))
  })

  test('only a Vercel preview gets the Vercel check, and steps stay numbered in order', () => {
    const vercel = buildInstallPrompt(answers)
    const fixed = buildInstallPrompt({ ...answers, preview: { kind: 'url', url: 'https://staging.example.com' } })
    assert.ok(vercel.includes('head: vercel'))
    assert.ok(!fixed.includes('Vercel preview deployment'))
    assert.deepEqual(vercel.match(/^\d+\. /gm), ['1. ', '2. ', '3. ', '4. '])
    assert.deepEqual(fixed.match(/^\d+\. /gm), ['1. ', '2. ', '3. '])
  })

  test('without a valid repository it points at the settings path instead of a broken link', () => {
    const prompt = buildInstallPrompt({ ...answers, repository: 'not a repo' })
    assert.ok(prompt.includes('Settings → Secrets and variables → Actions'))
    assert.ok(!prompt.includes('github.com/not'))
  })
})
