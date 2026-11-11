import { randomUUID } from 'node:crypto'

import { Bucket } from '@upstash/blob'

import { screenshotAssets } from './assets.js'

export const TOKEN_ENV = 'UPSTASH_BLOB_TOKEN'

export const BUCKET_OPTIONS = { cache: '1h', enableTelemetry: false }

export const PRIVATE_BUCKET_MESSAGE =
  'upstash blob: the bucket is private. Its signed links expire after 10 minutes at most, too soon for a pull request comment. Make the bucket public in the Upstash console: every run uploads under a random path, so its links cannot be guessed.'

export const createBucket = token => {
  if (!token) throw new Error(`upstash blob: ${TOKEN_ENV} is not set`)
  return new Bucket({ token, ...BUCKET_OPTIONS })
}

const joinPath = (...segments) => segments.join('/').split('/').filter(Boolean).join('/')

const assertPublic = async (bucket, runPrefix) => {
  const url = await bucket.publicUrl(`${runPrefix}/probe.png`)
  if (!url) throw new Error(PRIVATE_BUCKET_MESSAGE)
}

export const uploadAssets = async ({ summary, outDir, bucket, keyPrefix }) => {
  const runPrefix = joinPath(keyPrefix, randomUUID())
  await assertPublic(bucket, runPrefix)

  const urls = {}
  for await (const { slug, basename, body, urlKey } of screenshotAssets({ summary, outDir })) {
    const blob = await bucket.put(`${runPrefix}/${slug}-${basename}`, body, { contentType: 'image/png' })
    urls[urlKey] = blob.url
  }
  return urls
}

export const cleanupPrefix = ({ bucket, keyPrefix }) => bucket.del({ prefix: `${joinPath(keyPrefix)}/` })
