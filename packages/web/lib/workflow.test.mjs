import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  DEFAULT_THRESHOLD,
  BASE_URL_EXAMPLE,
  PREVIEW_URL_EXAMPLE,
  AGENT_PROMPT_BASE,
  addRoute,
  buildAgentPrompt,
  buildInstallPrompt,
  buildWorkflow,
  commitOnEnter,
  formatPercent,
  isHttpUrl,
  isPreviewValid,
  isRepository,
  urlOrExample,
  normalizeRoute,
  previewInput,
  removeRouteDisabled,
  secretsHref,
  secretsSettingsUrl,
  BLOB_STORES,
  STORAGE_PROVIDERS,
  isS3Provider,
  storageConfig,
  storageSecret
} from './workflow.ts'

const options = overrides => ({
  base: 'https://unavatar.io',
  preview: { kind: 'vercel' },
  routes: ['/'],
  threshold: DEFAULT_THRESHOLD,
  useApiKey: true,
  provider: 'r2',
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
      'concurrency:',
      '  group: visual-diff-${{ github.event.pull_request.number }}',
      "  cancel-in-progress: ${{ github.event.action != 'closed' }}",
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

  test('every S3 provider reads S3_CONFIG', () => {
    for (const provider of ['r2', 'aws', 'b2']) {
      const yaml = buildWorkflow(options({ provider }))
      assert.match(yaml, /^ {10}s3-config: \$\{\{ secrets\.S3_CONFIG \}\}$/m, provider)
      assert.doesNotMatch(yaml, /upstash/, provider)
    }
  })

  test('Vercel Blob reads its read-write token instead of S3_CONFIG', () => {
    const yaml = buildWorkflow(options({ provider: 'vercel' }))
    assert.ok(yaml.endsWith('          vercel-blob-token: ${{ secrets.BLOB_READ_WRITE_TOKEN }}\n'))
    assert.doesNotMatch(yaml, /s3-config|S3_CONFIG|upstash/)
  })

  test('Upstash Blob reads its token instead of S3_CONFIG, as the last input like the README', () => {
    const yaml = buildWorkflow(options({ provider: 'upstash' }))
    assert.ok(yaml.endsWith('          upstash-blob-token: ${{ secrets.UPSTASH_BLOB_TOKEN }}\n'))
    assert.doesNotMatch(yaml, /s3-config|S3_CONFIG/)
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

describe('storage providers', () => {
  test('the blob stores are offered after the S3 providers, and only they are not S3', () => {
    assert.deepEqual(STORAGE_PROVIDERS.map(({ id }) => id), ['r2', 'aws', 'b2', 'upstash', 'vercel'])
    assert.deepEqual(STORAGE_PROVIDERS.filter(({ id }) => !isS3Provider(id)), [
      { id: 'upstash', label: 'Upstash Blob' },
      { id: 'vercel', label: 'Vercel Blob' }
    ])
  })

  test('each blob store keeps the label the picker shows', () => {
    for (const [id, store] of Object.entries(BLOB_STORES)) {
      assert.equal(STORAGE_PROVIDERS.find(provider => provider.id === id).label, store.label)
    }
  })

  test('Upstash needs a public bucket and Vercel a private store, matching what the action enforces', () => {
    assert.equal(BLOB_STORES.upstash.access, 'public')
    assert.equal(BLOB_STORES.vercel.access, 'private')
  })

  test('each provider names the secret and the action input that reads it', () => {
    assert.deepEqual(storageSecret('r2'), { name: 'S3_CONFIG', input: 's3-config' })
    assert.deepEqual(storageSecret('b2'), { name: 'S3_CONFIG', input: 's3-config' })
    assert.deepEqual(storageSecret('upstash'), { name: 'UPSTASH_BLOB_TOKEN', input: 'upstash-blob-token' })
    assert.deepEqual(storageSecret('vercel'), { name: 'BLOB_READ_WRITE_TOKEN', input: 'vercel-blob-token' })
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

  test('Upstash Blob asks for the token of a public bucket and no S3 config', () => {
    const prompt = buildInstallPrompt({ ...answers, provider: 'upstash' })
    assert.ok(prompt.includes(`\`\`\`yaml\n${buildWorkflow({ ...answers, provider: 'upstash' })}\`\`\``))
    assert.ok(prompt.includes('`UPSTASH_BLOB_TOKEN`: the token of the Upstash Blob bucket'))
    assert.ok(prompt.includes('https://console.upstash.com'))
    assert.ok(prompt.includes('The bucket must be public'))
    assert.ok(prompt.includes('expire within 10 minutes'))
    assert.ok(!prompt.includes('S3_CONFIG'))
    assert.ok(!prompt.includes('```json'))
    assert.ok(!prompt.includes('ListBucket'))
  })

  test('Vercel Blob asks for the read-write token of a private store and no S3 config', () => {
    const prompt = buildInstallPrompt({ ...answers, provider: 'vercel' })
    assert.ok(prompt.includes(`\`\`\`yaml\n${buildWorkflow({ ...answers, provider: 'vercel' })}\`\`\``))
    assert.ok(prompt.includes('`BLOB_READ_WRITE_TOKEN`: the token of the Vercel Blob store'))
    assert.ok(prompt.includes('https://vercel.com/dashboard/stores'))
    assert.ok(prompt.includes('The store must be private'))
    assert.ok(prompt.includes('expire after 24 hours'))
    assert.ok(!prompt.includes('S3_CONFIG'))
    assert.ok(!prompt.includes('```json'))
  })

  test('without an API key it explains the free tier and asks for no key', () => {
    const prompt = buildInstallPrompt({ ...answers, useApiKey: false })
    assert.ok(!prompt.includes('MICROLINK_API_KEY'))
    assert.ok(prompt.includes('free endpoint, 5 requests a day'))
    assert.ok(prompt.includes('raises that to 25 requests a day'))
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

describe('workflow values from an unfinished form', () => {
  test('an empty or invalid URL falls back to the example, so the YAML always runs', () => {
    assert.equal(urlOrExample('', PREVIEW_URL_EXAMPLE), PREVIEW_URL_EXAMPLE)
    assert.equal(urlOrExample('staging', PREVIEW_URL_EXAMPLE), PREVIEW_URL_EXAMPLE)
    assert.equal(urlOrExample(' https://acme.dev ', BASE_URL_EXAMPLE), 'https://acme.dev')
    const yaml = buildWorkflow({
      base: urlOrExample('', BASE_URL_EXAMPLE),
      preview: { kind: 'url', url: urlOrExample('', PREVIEW_URL_EXAMPLE) },
      routes: ['/'],
      threshold: DEFAULT_THRESHOLD,
      useApiKey: false,
      provider: 'r2'
    })
    assert.match(yaml, /^ {10}base: https:\/\/example\.com$/m)
    assert.match(yaml, /^ {10}head: https:\/\/staging\.example\.com$/m)
  })
})

describe('buildAgentPrompt', () => {
  const urls = {
    docsUrl: 'https://github.com/microlinkhq/difftool#github-action',
    dashboardUrl: 'https://dashboard.microlink.io',
    siteUrl: 'https://difftool.microlink.io'
  }
  const prompt = buildAgentPrompt(urls)

  test('embeds the workflow template with a production placeholder the agent must replace', () => {
    const template = buildWorkflow({ ...options(), base: AGENT_PROMPT_BASE })
    assert.ok(prompt.includes(`\`\`\`yaml\n${template}\`\`\``))
    assert.ok(prompt.includes(`replacing \`${AGENT_PROMPT_BASE}\``))
  })

  test('asks the agent to discover production, previews and routes, and to ask when unsure', () => {
    assert.ok(prompt.includes('Find the production URL'))
    assert.ok(prompt.includes('If you cannot tell for sure, ask me'))
    assert.ok(prompt.includes('keep `head: vercel`'))
    assert.ok(prompt.includes('ask me for the preview URL'))
    assert.ok(prompt.includes('Pick the routes to compare'))
  })

  test('keeps secrets out of the repository and explains both of them', () => {
    assert.ok(prompt.includes('Never write secret values into a file or a commit'))
    assert.ok(prompt.includes('`S3_CONFIG`'))
    assert.ok(prompt.includes('r2.cloudflarestorage.com'))
    assert.ok(prompt.includes('AWS S3, Backblaze B2 also work'))
    assert.ok(prompt.includes('If I use Upstash Blob instead, replace the `s3-config` line with `upstash-blob-token: ${{ secrets.UPSTASH_BLOB_TOKEN }}`'))
    assert.ok(prompt.includes('The bucket must be public'))
    assert.ok(prompt.includes('If I use Vercel Blob instead, replace the `s3-config` line with `vercel-blob-token: ${{ secrets.BLOB_READ_WRITE_TOKEN }}`'))
    assert.ok(prompt.includes('The store must be private'))
    assert.ok(prompt.includes('`MICROLINK_API_KEY`: optional'))
    assert.ok(prompt.includes('free endpoint, 5 requests a day'))
  })

  test('links every surface it mentions and numbers steps in order', () => {
    for (const url of Object.values(urls)) assert.ok(prompt.includes(url), url)
    assert.deepEqual(prompt.match(/^\d+\. /gm), ['1. ', '2. ', '3. ', '4. ', '5. ', '6. '])
    assert.ok(prompt.endsWith('Change nothing else in the repository.\n'))
  })
})
