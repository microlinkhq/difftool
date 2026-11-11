import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { presignUrl } from '@vercel/blob'

import { UPLOADED_KEYS, summary, writeScreenshots } from './helpers/screenshots.js'
import {
  DEFAULT_TTL_SECONDS,
  MAX_TTL_SECONDS,
  cleanupPrefix,
  createStore,
  linkLifetimeSeconds,
  uploadAssets
} from '../src/vercel.js'

const KEY_PREFIX = 'acme/site/pr-7/abc123'
const NOW = Date.now()
const CLIENT_SIGNING_SECRET = 'client-signing-secret'
const STORE_HOST = 'https://abcd1234.private.blob.vercel-storage.com'

const delegationFor = ({ operations, validUntil }) => {
  const payload = Buffer.from(JSON.stringify({ storeId: 'store_AbCd1234', pathname: '*', operations, validUntil }))
  return `${payload.toString('base64url')}.signature`
}

const fakeStore = ({ putError, host = STORE_HOST, pages = [] } = {}) => {
  const uploads = new Map()
  const issued = []
  const listed = []
  const deleted = []
  return {
    uploads,
    issued,
    listed,
    deleted,
    issueSignedToken: async options => {
      issued.push(options)
      return { delegationToken: delegationFor(options), clientSigningToken: CLIENT_SIGNING_SECRET, validUntil: options.validUntil }
    },
    presignUrl,
    put: async (pathname, body, options) => {
      if (putError) throw putError
      uploads.set(pathname, { body, options })
      return { pathname, url: `${host}/${pathname}` }
    },
    list: async options => {
      listed.push(options)
      return pages[listed.length - 1] ?? { blobs: [], hasMore: false }
    },
    del: async urls => {
      deleted.push(urls)
    }
  }
}

let screenshots
let outDir

before(async () => {
  screenshots = await writeScreenshots()
  outDir = screenshots.outDir
})

after(() => screenshots.remove())

describe('uploadAssets', () => {
  test('uploads every screenshot privately, at the same paths as S3, and links each to a presigned URL', async () => {
    const store = fakeStore()
    const urls = await uploadAssets({ summary, outDir, store, keyPrefix: KEY_PREFIX, now: NOW })

    assert.deepEqual(Object.keys(urls).sort(), UPLOADED_KEYS)
    assert.deepEqual([...store.uploads.keys()].sort(), UPLOADED_KEYS.map(key => `${KEY_PREFIX}/${key.replace('/', '-')}`).sort())
    for (const { options } of store.uploads.values()) {
      assert.deepEqual(options, { access: 'private', contentType: 'image/png', addRandomSuffix: false, allowOverwrite: true })
    }
    for (const [urlKey, url] of Object.entries(urls)) {
      const link = new URL(url)
      assert.equal(link.origin, STORE_HOST)
      assert.equal(link.pathname, `/${KEY_PREFIX}/${urlKey.replace('/', '-')}`)
      assert.ok(link.searchParams.get('vercel-blob-signature'), urlKey)
    }
  })

  test('never puts the signing secret in a link', async () => {
    const urls = await uploadAssets({ summary, outDir, store: fakeStore(), keyPrefix: KEY_PREFIX, now: NOW })
    for (const url of Object.values(urls)) assert.ok(!url.includes(CLIENT_SIGNING_SECRET), url)
  })

  test('links last 24 hours by default, and a read-only token is issued once per run', async () => {
    const store = fakeStore()
    const urls = await uploadAssets({ summary, outDir, store, keyPrefix: KEY_PREFIX, now: NOW })
    const expected = NOW + DEFAULT_TTL_SECONDS * 1000

    assert.deepEqual(store.issued, [{ operations: ['get'], validUntil: expected }])
    for (const url of Object.values(urls)) {
      const [payload] = new URL(url).searchParams.get('vercel-blob-delegation').split('.')
      assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).validUntil, expected)
    }
  })

  test('an empty SHA leaves no empty segment in the path', async () => {
    const store = fakeStore()
    await uploadAssets({ summary, outDir, store, keyPrefix: 'acme/site/pr-7/', now: NOW })
    for (const pathname of store.uploads.keys()) assert.match(pathname, /^acme\/site\/pr-7\/[a-z]+-[a-z]+\.png$/)
  })

  test('a public store is refused after its first upload, and that upload is deleted', async () => {
    const host = 'https://abcd1234.public.blob.vercel-storage.com'
    const store = fakeStore({ host })
    await assert.rejects(
      uploadAssets({ summary, outDir, store, keyPrefix: KEY_PREFIX, now: NOW }),
      { message: /^vercel blob: the store is public\. .*Access set to Private/ }
    )
    const [pathname] = store.uploads.keys()
    assert.equal(store.uploads.size, 1)
    assert.deepEqual(store.deleted, [`${host}/${pathname}`])
  })

  test('an access error from Vercel carries the private-store hint, any other error does not', async () => {
    await assert.rejects(
      uploadAssets({ summary, outDir, store: fakeStore({ putError: new Error('Vercel Blob: Access denied.') }), keyPrefix: KEY_PREFIX, now: NOW }),
      { message: /^vercel blob: Vercel Blob: Access denied\. .*Access set to Private/ }
    )
    await assert.rejects(
      uploadAssets({ summary, outDir, store: fakeStore({ putError: new Error('Vercel Blob: Too many requests.') }), keyPrefix: KEY_PREFIX, now: NOW }),
      { message: 'vercel blob: Vercel Blob: Too many requests.' }
    )
    await assert.rejects(
      uploadAssets({ summary, outDir, store: fakeStore({ putError: new Error('Vercel Blob: This store is public.') }), keyPrefix: KEY_PREFIX, now: NOW }),
      { message: /^vercel blob: Vercel Blob: This store is public\. .*Access set to Private/ }
    )
  })

  test('a fractional TTL still issues a whole-millisecond expiry', async () => {
    const store = fakeStore()
    await uploadAssets({ summary, outDir, store, keyPrefix: KEY_PREFIX, ttlSeconds: 1.5, now: NOW })
    assert.ok(Number.isInteger(store.issued[0].validUntil))
  })
})

describe('linkLifetimeSeconds', () => {
  test('defaults to a day, honors presigned-ttl-seconds, and stays under the 7-day Vercel maximum', () => {
    assert.equal(linkLifetimeSeconds(undefined), 86400)
    assert.equal(linkLifetimeSeconds(3600), 3600)
    assert.equal(linkLifetimeSeconds(30 * 86400), MAX_TTL_SECONDS)
    assert.ok(MAX_TTL_SECONDS < 7 * 86400)
  })
})

describe('cleanupPrefix', () => {
  test('pages through the PR prefix, deletes each page by URL and counts what it removed', async () => {
    const blob = name => ({ url: `${STORE_HOST}/acme/site/pr-1/${name}`, pathname: `acme/site/pr-1/${name}` })
    const store = fakeStore({
      pages: [
        { blobs: [blob('a.png'), blob('b.png')], hasMore: true, cursor: 'next' },
        { blobs: [blob('c.png')], hasMore: false }
      ]
    })

    assert.equal(await cleanupPrefix({ store, keyPrefix: 'acme/site/pr-1' }), 3)
    assert.deepEqual(store.listed, [
      { prefix: 'acme/site/pr-1/', cursor: undefined, limit: 100 },
      { prefix: 'acme/site/pr-1/', cursor: 'next', limit: 100 }
    ])
    assert.deepEqual(store.deleted, [
      [`${STORE_HOST}/acme/site/pr-1/a.png`, `${STORE_HOST}/acme/site/pr-1/b.png`],
      [`${STORE_HOST}/acme/site/pr-1/c.png`]
    ])
  })

  test('a finished page is not followed when it still carries a cursor', async () => {
    const blob = name => ({ url: `${STORE_HOST}/acme/site/pr-1/${name}`, pathname: `acme/site/pr-1/${name}` })
    const store = fakeStore({
      pages: [{ blobs: [blob('a.png')], hasMore: false, cursor: 'stale' }]
    })

    assert.equal(await cleanupPrefix({ store, keyPrefix: 'acme/site/pr-1' }), 1)
    assert.equal(store.listed.length, 1)
  })

  test('an empty prefix deletes nothing', async () => {
    const store = fakeStore()
    assert.equal(await cleanupPrefix({ store, keyPrefix: 'acme/site/pr-1' }), 0)
    assert.deepEqual(store.deleted, [])
  })
})

describe('createStore', () => {
  test('fails with the variable to set when the token is missing', () => {
    assert.throws(() => createStore(undefined), { message: 'vercel blob: BLOB_READ_WRITE_TOKEN is not set' })
    assert.throws(() => createStore(''), { message: 'vercel blob: BLOB_READ_WRITE_TOKEN is not set' })
  })
})
