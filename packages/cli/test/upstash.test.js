import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

import { UPLOADED_KEYS, summary, writeScreenshots } from './helpers/screenshots.js'
import { BUCKET_OPTIONS, PRIVATE_BUCKET_MESSAGE, cleanupPrefix, createBucket, uploadAssets } from '../src/upstash.js'

const PUBLIC_HOST = 'https://b0f3a91c24d.blob.upstash.io'
const KEY_PREFIX = 'acme/site/pr-7/abc123'
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const fakeBucket = ({ isPublic = true } = {}) => {
  const objects = new Map()
  const deleted = []
  const urlFor = objectPath => (isPublic ? `${PUBLIC_HOST}/${objectPath}` : undefined)
  return {
    objects,
    deleted,
    publicUrl: async objectPath => urlFor(objectPath),
    put: async (objectPath, body, options) => {
      objects.set(objectPath, { body, options })
      return { path: objectPath, url: urlFor(objectPath) }
    },
    del: async target => {
      deleted.push(target)
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
  test('uploads every screenshot that exists as a PNG and maps it to its public URL', async () => {
    const bucket = fakeBucket()
    const urls = await uploadAssets({ summary, outDir, bucket, keyPrefix: KEY_PREFIX })

    assert.deepEqual(Object.keys(urls).sort(), UPLOADED_KEYS)
    for (const [objectPath, { body, options }] of bucket.objects) {
      assert.equal(options.contentType, 'image/png')
      assert.ok(urls[body.toString().replace('-', '/')].endsWith(objectPath), objectPath)
    }
  })

  test('puts each run under the PR prefix plus a random segment, so links cannot be guessed', async () => {
    const first = fakeBucket()
    const second = fakeBucket()
    await uploadAssets({ summary, outDir, bucket: first, keyPrefix: KEY_PREFIX })
    await uploadAssets({ summary, outDir, bucket: second, keyPrefix: KEY_PREFIX })

    const runSegments = bucket =>
      new Set([...bucket.objects.keys()].map(objectPath => {
        assert.ok(objectPath.startsWith(`${KEY_PREFIX}/`), objectPath)
        const [segment, file] = objectPath.slice(KEY_PREFIX.length + 1).split('/')
        assert.match(segment, UUID_SEGMENT)
        assert.match(file, /^(root|pricing)-(base|head|diff|review)\.png$/)
        return segment
      }))

    const [firstSegment] = runSegments(first)
    const [secondSegment] = runSegments(second)
    assert.equal(runSegments(first).size, 1)
    assert.notEqual(firstSegment, secondSegment)
  })

  test('refuses a private bucket before uploading anything', async () => {
    const bucket = fakeBucket({ isPublic: false })
    await assert.rejects(
      uploadAssets({ summary, outDir, bucket, keyPrefix: KEY_PREFIX }),
      { message: PRIVATE_BUCKET_MESSAGE }
    )
    assert.equal(bucket.objects.size, 0)
  })

  test('an empty SHA leaves no empty segment in the path', async () => {
    const bucket = fakeBucket()
    await uploadAssets({ summary, outDir, bucket, keyPrefix: 'acme/site/pr-7/' })
    for (const objectPath of bucket.objects.keys()) {
      assert.match(objectPath, /^acme\/site\/pr-7\/[0-9a-f-]{36}\/[a-z]+-[a-z]+\.png$/)
    }
  })

  test('a route with no screenshots on disk uploads nothing for it', async () => {
    const bucket = fakeBucket()
    const urls = await uploadAssets({
      summary: { routes: [{ route: '/missing', outDir: 'missing' }] },
      outDir,
      bucket,
      keyPrefix: KEY_PREFIX
    })
    assert.deepEqual(urls, {})
  })
})

describe('cleanupPrefix', () => {
  test('deletes the whole PR prefix, closed with a slash so pr-1 never matches pr-10', async () => {
    const bucket = fakeBucket()
    await cleanupPrefix({ bucket, keyPrefix: 'acme/site/pr-1' })
    assert.deepEqual(bucket.deleted, [{ prefix: 'acme/site/pr-1/' }])
  })
})

describe('createBucket', () => {
  test('caches for an hour, so a deleted screenshot stops being served soon after the PR closes, and sends no telemetry', () => {
    assert.deepEqual(BUCKET_OPTIONS, { cache: '1h', enableTelemetry: false })
  })

  test('fails with the variable to set when the token is missing', () => {
    assert.throws(() => createBucket(undefined), { message: 'upstash blob: UPSTASH_BLOB_TOKEN is not set' })
    assert.throws(() => createBucket(''), { message: 'upstash blob: UPSTASH_BLOB_TOKEN is not set' })
  })
})
