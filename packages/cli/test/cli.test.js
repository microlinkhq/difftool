import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url))

const run = args => spawnSync(process.execPath, [cli, ...args], {
  encoding: 'utf8',
  env: { ...process.env, UPSTASH_BLOB_TOKEN: '', BLOB_READ_WRITE_TOKEN: '' }
})

const rejectsMissing = (command, flags, message) => {
  for (const flag of flags) {
    test(`${command} rejects a missing ${flag}`, () => {
      const args = [command]
      for (const other of flags) {
        if (other !== flag) args.push(other, 'value')
      }
      const result = run(args)
      assert.equal(result.status, 2)
      assert.match(result.stderr, message)
    })
  }

  test(`${command} with every required flag does not report them missing`, () => {
    const args = [command]
    for (const flag of flags) args.push(flag, 'value')
    const result = run(args)
    assert.equal(result.status, 2)
    assert.doesNotMatch(result.stderr, message)
  })
}

rejectsMissing(
  'upload-upstash',
  ['--summary', '--out-dir', '--key-prefix', '--urls-out'],
  /upload-upstash: --summary, --out-dir, --key-prefix, --urls-out are all required/
)

rejectsMissing(
  'upload-vercel',
  ['--summary', '--out-dir', '--key-prefix', '--urls-out'],
  /upload-vercel: --summary, --out-dir, --key-prefix, --urls-out are all required/
)

rejectsMissing('cleanup-upstash', ['--key-prefix'], /cleanup-upstash: --key-prefix is required/)
rejectsMissing('cleanup-vercel', ['--key-prefix'], /cleanup-vercel: --key-prefix is required/)

test('a symlinked bin still parses arguments', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'difftool-bin-'))
  const link = path.join(dir, 'microlink-difftool')
  try {
    symlinkSync(cli, link)
    const result = spawnSync(process.execPath, [link, 'cleanup-upstash'], {
      encoding: 'utf8',
      env: { ...process.env, UPSTASH_BLOB_TOKEN: '', BLOB_READ_WRITE_TOKEN: '' }
    })
    assert.equal(result.status, 2)
    assert.match(result.stderr, /cleanup-upstash: --key-prefix is required/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('upload-vercel rejects a TTL that is not a positive number', () => {
  for (const ttl of ['foo', '0']) {
    const result = run([
      'upload-vercel',
      '--summary', 'summary.json',
      '--out-dir', 'out',
      '--key-prefix', 'acme/site/pr-1',
      '--urls-out', 'urls.json',
      '--ttl-seconds', ttl
    ])
    assert.equal(result.status, 2, ttl)
    assert.match(result.stderr, /--ttl-seconds must be a positive number of seconds/, ttl)
  }
})

test('importing the CLI does not require it to be the process entry point', () => {
  const href = pathToFileURL(cli).href
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '-e',
    `await import(${JSON.stringify(href)})`
  ], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})
