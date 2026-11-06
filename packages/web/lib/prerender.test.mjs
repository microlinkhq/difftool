import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { findPrerenderProblem, findReadProblem } from './prerender.mjs'

const script = fileURLToPath(new URL('../scripts/check-prerender.mjs', import.meta.url))

function runCheck(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

const landing = '<main id="main" tabindex="-1"><h1>Spot every pixel</h1></main>'
const bailout = (content) => `<!--$!--><template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>${content}<!--/$-->`
const pending = (content) => `<!--$?--><template id="B:0"></template>${content}<!--/$-->`
const resolved = (content) => `<!--$-->${content}<!--/$-->`

describe('prerender check', () => {
  test('accepts a landing rendered outside any boundary', () => {
    assert.equal(findPrerenderProblem(`<body>${landing}</body>`), null)
  })

  test('accepts a landing next to an empty client-only boundary such as Vercel Analytics', () => {
    assert.equal(findPrerenderProblem(`<body>${landing}${resolved('')}${bailout('')}</body>`), null)
  })

  test('accepts a landing inside a resolved boundary', () => {
    assert.equal(findPrerenderProblem(`<body>${resolved(landing)}${bailout('')}</body>`), null)
  })

  test('rejects a landing rendered as the fallback of a client-side bailout', () => {
    assert.match(findPrerenderProblem(`<body>${bailout(landing)}</body>`), /throws the server HTML away/)
  })

  test('rejects a landing nested in a resolved boundary inside a bailout', () => {
    assert.match(findPrerenderProblem(`<body>${bailout(resolved(landing))}</body>`), /throws the server HTML away/)
  })

  test('ignores other attributes that end in main', () => {
    const html = `<body><div data-testid="main"></div>${bailout(landing)}</body>`
    assert.match(findPrerenderProblem(html), /throws the server HTML away/)
  })

  test('rejects a page without the landing', () => {
    assert.match(findPrerenderProblem('<body></body>'), /landing <main> is missing/)
  })

  test('rejects a landing rendered as the fallback of a pending boundary', () => {
    assert.match(findPrerenderProblem(`<body>${pending(landing)}</body>`), /throws the server HTML away/)
  })

  test('accepts a landing next to an empty pending boundary', () => {
    assert.equal(findPrerenderProblem(`<body>${landing}${pending('')}</body>`), null)
  })

  test('accepts a landing after a closed client boundary', () => {
    assert.equal(findPrerenderProblem(`<body>${bailout('')}${landing}</body>`), null)
  })

  test('an attribute that only ends in id does not count as the landing', () => {
    const html = `<body><main data-id="main"></main>${bailout(landing)}</body>`
    assert.match(findPrerenderProblem(html), /throws the server HTML away/)
  })

  test('a missing prerender file is the static-render failure', () => {
    assert.match(findReadProblem({ code: 'ENOENT' }), /not prerendered as static HTML/)
  })

  test('the check requires the prerendered file', () => {
    const result = runCheck([])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /pass the path/)
  })

  test('the check fails when that file was not prerendered', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prerender-'))
    try {
      const result = runCheck([join(dir, 'index.html')])
      assert.equal(result.status, 1)
      assert.match(result.stderr, /not prerendered as static HTML/)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  test('the check accepts prerendered landing HTML', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prerender-'))
    const file = join(dir, 'index.html')
    writeFileSync(file, `<body>${landing}</body>`)
    try {
      const result = runCheck([file])
      assert.equal(result.status, 0)
      assert.match(result.stdout, /fully prerendered/)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  test('the check rejects a landing the client will replace', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prerender-'))
    const file = join(dir, 'index.html')
    writeFileSync(file, `<body>${bailout(landing)}</body>`)
    try {
      const result = runCheck([file])
      assert.equal(result.status, 1)
      assert.match(result.stderr, /throws the server HTML away/)
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
