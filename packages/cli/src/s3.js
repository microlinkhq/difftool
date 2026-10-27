import fs from 'node:fs/promises'
import path from 'node:path'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REQUIRED_CONFIG_FIELDS = ['accessKeyId', 'secretAccessKey', 'bucket']

const DEFAULT_TTL_SECONDS = 86400

const FILES = ['base.png', 'head.png', 'diff.png', 'review.png']

const slugFor = route => {
  if (!route.outDir || route.outDir === '.') return 'root'
  return route.outDir
}

const validateConfig = config => {
  if (!config || typeof config !== 'object') {
    throw new Error('s3 config: missing or not a JSON object')
  }
  const missing = REQUIRED_CONFIG_FIELDS.filter(f => !config[f])
  if (missing.length) {
    throw new Error(`s3 config: missing required field(s): ${missing.join(', ')}`)
  }
}

const buildClient = config => {
  const opts = {
    region: config.region || 'auto',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  }
  if (config.endpoint) opts.endpoint = config.endpoint
  if (config.forcePathStyle !== undefined) opts.forcePathStyle = !!config.forcePathStyle
  return new S3Client(opts)
}

export const uploadAssets = async ({ summary, outDir, config, keyPrefix, ttlSeconds }) => {
  validateConfig(config)
  const client = buildClient(config)
  const bucket = config.bucket
  const expiresIn = ttlSeconds || config.presignedTtlSeconds || DEFAULT_TTL_SECONDS
  const urls = {}

  for (const route of summary.routes) {
    const slug = slugFor(route)
    const routeDir = !route.outDir || route.outDir === '.' ? outDir : path.join(outDir, route.outDir)

    for (const basename of FILES) {
      const localPath = path.join(routeDir, basename)
      let body
      try {
        body = await fs.readFile(localPath)
      } catch (err) {
        if (err.code === 'ENOENT') {
          continue
        }
        throw err
      }

      const key = `${keyPrefix}/${slug}-${basename}`

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'image/png'
        })
      )

      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn }
      )

      urls[`${slug}/${basename}`] = url
    }
  }

  return urls
}

export const cleanupPrefix = async ({ config, keyPrefix }) => {
  validateConfig(config)
  const client = buildClient(config)
  const bucket = config.bucket

  let continuationToken
  let totalDeleted = 0

  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${keyPrefix}/`,
        ContinuationToken: continuationToken
      })
    )

    const objects = (list.Contents || []).map(o => ({ Key: o.Key }))
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects }
        })
      )
      totalDeleted += objects.length
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (continuationToken)

  return totalDeleted
}
