import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import { screenshotAssets } from '../src/assets.js'

const collect = async (summary, outDir) => {
  const assets = []
  for await (const asset of screenshotAssets({ summary, outDir })) assets.push(asset)
  return assets
}

const withOutDir = async fn => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'difftool-assets-'))
  try {
    await fn(outDir)
  } finally {
    await rm(outDir, { recursive: true, force: true })
  }
}

test('a single-route summary reads the top of the out dir and uses the root slug', async () => {
  await withOutDir(async outDir => {
    await writeFile(path.join(outDir, 'base.png'), 'top')
    await mkdir(path.join(outDir, 'root'))
    await writeFile(path.join(outDir, 'root', 'base.png'), 'nested')

    const assets = await collect({ routes: [{ route: '/', outDir: '.' }] }, outDir)

    assert.deepEqual(assets.map(({ urlKey, body }) => [urlKey, body.toString()]), [['root/base.png', 'top']])
  })
})

test('a route with no outDir reads the top of the out dir and uses the root slug', async () => {
  await withOutDir(async outDir => {
    await writeFile(path.join(outDir, 'base.png'), 'top')
    await mkdir(path.join(outDir, 'root'))
    await writeFile(path.join(outDir, 'root', 'base.png'), 'nested')

    const assets = await collect({ routes: [{ route: '/' }] }, outDir)

    assert.deepEqual(assets.map(({ urlKey, body }) => [urlKey, body.toString()]), [['root/base.png', 'top']])
  })
})

test('a read error other than a missing file is raised', async () => {
  await withOutDir(async outDir => {
    await writeFile(path.join(outDir, 'not-a-dir'), 'x')
    await assert.rejects(
      collect({ routes: [{ route: '/x', outDir: 'not-a-dir' }] }, outDir),
      { code: 'ENOTDIR' }
    )
  })
})
