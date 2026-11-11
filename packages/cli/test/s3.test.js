import assert from 'node:assert/strict'
import { mock } from 'node:test'

const sent = []

mock.module('@aws-sdk/client-s3', {
  exports: {
    S3Client: class {
      async send (command) {
        sent.push(command)
        return {}
      }
    },
    PutObjectCommand: class {
      constructor (input) { this.input = input }
    },
    GetObjectCommand: class {
      constructor (input) { this.input = input }
    },
    ListObjectsV2Command: class {
      constructor (input) { this.input = input }
    },
    DeleteObjectsCommand: class {
      constructor (input) { this.input = input }
    }
  }
})

mock.module('@aws-sdk/s3-request-presigner', {
  exports: {
    getSignedUrl: async (_client, command) => `https://example.test/${command.input.Key}`
  }
})

const { uploadAssets } = await import('../src/s3.js')
const { summary, writeScreenshots } = await import('./helpers/screenshots.js')
const { after, before, test } = await import('node:test')

const config = { accessKeyId: 'ak', secretAccessKey: 'sk', bucket: 'assets' }

let screenshots
let outDir

before(async () => {
  screenshots = await writeScreenshots()
  outDir = screenshots.outDir
})

after(() => screenshots.remove())

const keysFor = async keyPrefix => {
  sent.length = 0
  await uploadAssets({ summary, outDir, config, keyPrefix })
  return sent.filter(command => command.input.Body).map(command => command.input.Key)
}

test('an empty SHA leaves no empty segment in the S3 key', async () => {
  const keys = await keysFor('acme/site/pr-7/')
  assert.ok(keys.includes('acme/site/pr-7/root-base.png'))
  assert.ok(keys.every(key => !key.includes('//')))
})

test('a normal prefix keeps every segment', async () => {
  const keys = await keysFor('acme/site/pr-7/abc123')
  assert.ok(keys.includes('acme/site/pr-7/abc123/root-base.png'))
})
