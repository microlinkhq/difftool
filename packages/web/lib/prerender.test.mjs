import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { findPrerenderProblem, findReadProblem } from './prerender.mjs'

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
})
