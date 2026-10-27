import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { renderComment } from '../src/render-comment.js'

const COMPARE_ORIGIN = 'https://difftool.microlink.io'

const readFixture = async name =>
  JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const compareLinks = markdown =>
  [...markdown.matchAll(/<a href="([^"]+)">compare<\/a>/g)].map(([, href]) => new URL(href))

test('compare links open the screenshots on difftool.microlink.io', async () => {
  const summary = await readFixture('summary.json')
  const assetUrls = await readFixture('asset-urls.json')
  const links = compareLinks(renderComment(summary, { assetUrls }))

  const pairs = links.map(link => [link.searchParams.get('base'), link.searchParams.get('head')])
  const expected = summary.routes.map(({ outDir }) => [assetUrls[`${outDir}/base.png`], assetUrls[`${outDir}/head.png`]])

  for (const link of links) assert.equal(link.origin, COMPARE_ORIGIN)
  assert.deepEqual(pairs.sort(), expected.sort())
})
