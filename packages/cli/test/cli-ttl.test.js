import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { mock } from 'node:test'

const received = []

mock.module('../src/vercel.js', {
  exports: {
    TOKEN_ENV: 'BLOB_READ_WRITE_TOKEN',
    createStore () {},
    async uploadAssets ({ ttlSeconds }) {
      received.push(ttlSeconds)
      return {}
    }
  }
})

const { cli } = await import('../bin/cli.js')
const { test } = await import('node:test')

const uploadVercel = cli.commands.find(command => command.name === 'upload-vercel').commandAction

const run = async ttlSeconds => {
  const dir = await mkdtemp(path.join(tmpdir(), 'difftool-cli-ttl-'))
  const summary = path.join(dir, 'summary.json')
  const urlsOut = path.join(dir, 'urls.json')
  await writeFile(summary, JSON.stringify({ routes: [] }))
  received.length = 0
  const write = console.error
  console.error = () => {}
  try {
    await uploadVercel({ summary, outDir: dir, keyPrefix: 'acme/site/pr-1/sha', urlsOut, ttlSeconds })
    return received[0]
  } finally {
    console.error = write
    await rm(dir, { recursive: true, force: true })
  }
}

test('upload-vercel passes a numeric TTL and omits it when the flag is absent', async () => {
  assert.equal(await run('3600'), 3600)
  assert.equal(await run(undefined), undefined)
})
