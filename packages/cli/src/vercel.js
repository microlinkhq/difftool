import { del, issueSignedToken, list, presignUrl, put } from '@vercel/blob'

import { joinPath, screenshotAssets } from './assets.js'

export const TOKEN_ENV = 'BLOB_READ_WRITE_TOKEN'

export const DEFAULT_TTL_SECONDS = 86400

const CLOCK_SKEW_MARGIN_SECONDS = 300

export const MAX_TTL_SECONDS = 7 * 86400 - CLOCK_SKEW_MARGIN_SECONDS

const ACCESS = 'private'

const DELETE_BATCH_SIZE = 100

const isPrivateStoreUrl = url => new URL(url).hostname.endsWith('.private.blob.vercel-storage.com')

const PRIVATE_STORE_HINT =
  'difftool needs a private Blob store: in the Vercel dashboard, create one with Access set to Private and use its read-write token.'

export const createStore = token => {
  if (!token) throw new Error(`vercel blob: ${TOKEN_ENV} is not set`)
  return {
    put: (pathname, body, options) => put(pathname, body, { ...options, token }),
    list: options => list({ ...options, token }),
    del: urls => del(urls, { token }),
    issueSignedToken: options => issueSignedToken({ ...options, token }),
    presignUrl
  }
}

export const linkLifetimeSeconds = ttlSeconds => Math.min(ttlSeconds || DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS)

const describePutError = err =>
  /access|public/i.test(err.message) ? `vercel blob: ${err.message} ${PRIVATE_STORE_HINT}` : `vercel blob: ${err.message}`

const uploadPrivate = async (store, pathname, body) => {
  let blob
  try {
    blob = await store.put(pathname, body, {
      access: ACCESS,
      contentType: 'image/png',
      addRandomSuffix: false,
      allowOverwrite: true
    })
  } catch (err) {
    throw new Error(describePutError(err))
  }
  if (!isPrivateStoreUrl(blob.url)) {
    await store.del(blob.url)
    throw new Error(`vercel blob: the store is public. ${PRIVATE_STORE_HINT}`)
  }
}

export const uploadAssets = async ({ summary, outDir, store, keyPrefix, ttlSeconds, now = Date.now() }) => {
  const validUntil = Math.floor(now + linkLifetimeSeconds(ttlSeconds) * 1000)
  const signedToken = await store.issueSignedToken({ operations: ['get'], validUntil })

  const urls = {}
  for await (const { slug, basename, body, urlKey } of screenshotAssets({ summary, outDir })) {
    const pathname = joinPath(keyPrefix, `${slug}-${basename}`)
    await uploadPrivate(store, pathname, body)
    const { presignedUrl } = await store.presignUrl(signedToken, { operation: 'get', pathname, access: ACCESS })
    urls[urlKey] = presignedUrl
  }
  return urls
}

export const cleanupPrefix = async ({ store, keyPrefix }) => {
  const prefix = `${joinPath(keyPrefix)}/`
  let deleted = 0
  let cursor
  do {
    const page = await store.list({ prefix, cursor, limit: DELETE_BATCH_SIZE })
    if (page.blobs.length > 0) {
      await store.del(page.blobs.map(blob => blob.url))
      deleted += page.blobs.length
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return deleted
}
