import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'

import { renderComment } from '../src/render-comment.js'
import { isImageUrl, readQuery } from '../web/lib.js'

const HOMEPAGE = 'https://difftool.microlink.io'
const PRESIGNED_S3_URL = side =>
  `https://bucket.s3.eu-west-1.amazonaws.com/owner/repo/pr-1/abc123/root-${side}.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=604800&X-Amz-Signature=deadbeef`

const readFixture = async name =>
  JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const readSummary = async () => {
  const summary = await readFixture('summary.json')
  return { ...summary, routes: summary.routes.map(route => ({ ...route, verdict: route.passed ? 'pass' : 'fail' })) }
}

const compareLinks = markdown =>
  [...markdown.matchAll(/<a href="([^"]+)">compare<\/a>/g)].map(([, href]) => new URL(href))

describe('render-comment compare links', () => {
  test('point at the difftool homepage', async () => {
    const markdown = renderComment(await readSummary(), { assetUrls: await readFixture('asset-urls.json') })
    const links = compareLinks(markdown)
    assert.ok(links.length > 0)
    for (const link of links) assert.equal(link.origin, HOMEPAGE)
  })

  test('open in the homepage as a direct image pair', async () => {
    const summary = await readSummary()
    const assetUrls = { 'root/base.png': PRESIGNED_S3_URL('base'), 'root/head.png': PRESIGNED_S3_URL('head') }
    const [link] = compareLinks(renderComment({ ...summary, routes: [summary.routes[0]] }, { assetUrls }))
    const query = readQuery(link.search)
    assert.equal(query.base, PRESIGNED_S3_URL('base'))
    assert.equal(query.head, PRESIGNED_S3_URL('head'))
    assert.ok(isImageUrl(query.base))
    assert.ok(isImageUrl(query.head))
  })
})
