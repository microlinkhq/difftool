import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { joinPath, screenshotAssets } from './assets.js'

const REQUIRED_CONFIG_FIELDS = ['accessKeyId', 'secretAccessKey', 'bucket']

const DEFAULT_TTL_SECONDS = 86400

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

  for await (const { slug, basename, body, urlKey } of screenshotAssets({ summary, outDir })) {
    const key = joinPath(keyPrefix, `${slug}-${basename}`)

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'image/png'
      })
    )

    urls[urlKey] = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn }
    )
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
