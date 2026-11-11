import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const action = readFileSync(fileURLToPath(new URL('../../../action.yml', import.meta.url)), 'utf8')

const stepScript = name => {
  const start = action.indexOf(`    - name: ${name}\n`)
  assert.notEqual(start, -1, name)
  const runAt = action.indexOf('\n      run: |\n', start)
  const next = action.indexOf('\n    - name:', runAt)
  return action.slice(runAt + '\n      run: |\n'.length, next === -1 ? action.length : next)
    .replace(/\n {8}/g, '\n')
    .replace(/^ {8}/, '')
    .trimEnd()
}

const runBash = (script, env) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'difftool-action-'))
  const output = path.join(dir, 'github-output')
  try {
    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, GITHUB_OUTPUT: output, ...env }
    })
    let written = ''
    try {
      written = readFileSync(output, 'utf8')
    } catch {
      written = ''
    }
    return { status: result.status, stderr: result.stderr, stdout: result.stdout, output: written }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('exactly one storage input selects that backend', () => {
  const script = stepScript('Resolve storage')
  for (const [envName, backend] of [
    ['S3_CONFIG', 's3'],
    ['UPSTASH_BLOB_TOKEN', 'upstash'],
    ['VERCEL_BLOB_TOKEN', 'vercel']
  ]) {
    const result = runBash(script, { [envName]: 'token' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.output, `backend=${backend}\n`, envName)
  }
})

test('zero storage inputs and every pair are refused', () => {
  const script = stepScript('Resolve storage')
  const inputs = ['S3_CONFIG', 'UPSTASH_BLOB_TOKEN', 'VERCEL_BLOB_TOKEN']
  assert.equal(runBash(script, {}).status, 2)
  for (const name of inputs) {
    const env = Object.fromEntries(inputs.filter(other => other !== name).map(other => [other, 'token']))
    assert.equal(runBash(script, env).status, 2, name)
  }
  assert.equal(runBash(script, Object.fromEntries(inputs.map(name => [name, 'token']))).status, 2)
})

test('each backend uploads and cleans up, and the comment reads that upload', () => {
  for (const backend of ['s3', 'upstash', 'vercel']) {
    assert.ok(action.includes(`steps.pr.outputs.mode == 'diff' && steps.storage.outputs.backend == '${backend}'`), backend)
    assert.ok(action.includes(`steps.pr.outputs.mode == 'cleanup' && steps.storage.outputs.backend == '${backend}'`), backend)
    assert.ok(action.includes(`steps.upload-${backend}.outputs.urls-path`), backend)
  }
})

test('a Vercel TTL is forwarded only when it is set, and Upstash upload ignores it', () => {
  const lines = stepScript('Upload screenshots to Vercel Blob').split('\n')
  const prelude = lines.slice(0, lines.findIndex(line => line.includes('node '))).join('\n')
  const flags = input => runBash(`${prelude}\nprintf '%s' "\${TTL_FLAG[*]}"`, { TTL_INPUT: input }).stdout
  assert.equal(flags(''), '')
  assert.equal(flags('3600'), '--ttl-seconds 3600')
  assert.doesNotMatch(stepScript('Upload screenshots to Upstash Blob'), /TTL_INPUT|ttl-seconds/)
})
