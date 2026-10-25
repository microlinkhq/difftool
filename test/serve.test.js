import assert from 'node:assert/strict'
import http from 'node:http'
import { after, before, describe, test } from 'node:test'

import { PNG } from 'pngjs'

import { createBrowserlessCapture, createServer } from '../src/serve.js'

const FAKE_PNG = PNG.sync.write(new PNG({ width: 2, height: 2 }))

const listen = server =>
  new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))

const close = server => new Promise(resolve => server.close(resolve))

const rawGet = (origin, path, headers = {}) =>
  new Promise((resolve, reject) => {
    http.get(`${origin}${path}`, { headers }, res => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    }).on('error', reject)
  })

describe('serve with a stub capture', () => {
  const calls = []
  const capture = async (url, { signal, ...options }) => {
    calls.push({ url, ...options })
    if (url.includes('slow')) {
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { calls.push({ aborted: url }); reject(new Error('aborted')) })
      })
    }
    if (url.includes('broken')) throw new Error('net::ERR_CONNECTION_REFUSED')
    return FAKE_PNG
  }
  const server = createServer({ capture })
  let origin

  before(async () => { origin = await listen(server) })
  after(() => close(server))

  test('health reports the local engine', async () => {
    const response = await fetch(`${origin}/api/health`)
    assert.deepEqual(await response.json(), { engine: 'local' })
  })

  test('screenshot passes the url and clamped viewport to the capture', async () => {
    const target = 'http://localhost:8000/pdf?a=1'
    const response = await fetch(`${origin}/api/screenshot?${new URLSearchParams({ url: target, width: '99999', height: '900' })}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/png')
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), FAKE_PNG)
    assert.deepEqual(calls.at(-1), { url: target, width: 3840, height: 900 })
  })

  test('height is clamped before it reaches the capture', async () => {
    for (const [height, expected] of [['1e9', 2160], ['-50', 200], ['tall', 900]]) {
      await fetch(`${origin}/api/screenshot?${new URLSearchParams({ url: 'http://localhost:8000', height })}`)
      assert.equal(calls.at(-1).height, expected, height)
    }
  })

  test('the api refuses requests for a non-loopback host (dns rebinding)', async () => {
    const before = calls.length
    const response = await rawGet(origin, '/api/screenshot?url=http%3A%2F%2F192.168.1.1', { host: 'evil.example' })
    assert.equal(response.status, 403)
    assert.equal(calls.length, before)
  })

  test('the api refuses cross-site browser requests', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const response = await rawGet(origin, '/api/health', { 'sec-fetch-site': site })
      assert.equal(response.status, 403, site)
    }
    assert.equal((await rawGet(origin, '/api/health', { 'sec-fetch-site': 'same-origin' })).status, 200)
  })

  test('a client that goes away aborts its capture', async () => {
    const controller = new AbortController()
    const request = fetch(`${origin}/api/screenshot?url=${encodeURIComponent('http://slow.test')}`, { signal: controller.signal })
    await new Promise(resolve => setTimeout(resolve, 100))
    controller.abort()
    await request.catch(() => {})
    await new Promise(resolve => setTimeout(resolve, 100))
    assert.ok(calls.some(call => call.aborted === 'http://slow.test'))
  })

  test('screenshot rejects non-http urls before capturing', async () => {
    const before = calls.length
    const response = await fetch(`${origin}/api/screenshot?url=${encodeURIComponent('file:///etc/passwd')}`)
    assert.equal(response.status, 400)
    assert.equal(calls.length, before)
  })

  test('capture failures surface as a 502 with the reason', async () => {
    const response = await fetch(`${origin}/api/screenshot?url=${encodeURIComponent('http://broken.test')}`)
    assert.equal(response.status, 502)
    assert.match((await response.json()).message, /ERR_CONNECTION_REFUSED/)
  })

  test('serves the homepage and its modules', async () => {
    const page = await fetch(`${origin}/`)
    assert.match(page.headers.get('content-type'), /text\/html/)
    assert.match(await page.text(), /<form id="form"/)
    const module = await fetch(`${origin}/lib.js`)
    assert.match(module.headers.get('content-type'), /text\/javascript/)
  })

  test('never serves files outside the web root', async () => {
    for (const path of ['/../package.json', '/%2e%2e/package.json', '/..%2fsrc/serve.js']) {
      const response = await new Promise(resolve =>
        http.get(`${origin}${path}`, res => { res.resume(); resolve(res) }))
      assert.equal(response.statusCode, 404, path)
    }
  })

  test('malformed paths are rejected without crashing', async () => {
    for (const path of ['/%E0%A4%A', '//']) {
      assert.equal((await rawGet(origin, path)).status, 400, path)
    }
    assert.equal((await fetch(`${origin}/api/health`)).status, 200)
  })
})

describe('serve with the real Chromium capture', { timeout: 120_000 }, () => {
  const PAGE_HEIGHT = 2400
  const fixture = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<!doctype html><body style="margin:0"><div style="height:${PAGE_HEIGHT}px;background:linear-gradient(red,blue)"></div></body>`)
  })
  const capture = createBrowserlessCapture()
  const server = createServer({ capture })
  let origin
  let fixtureOrigin

  before(async () => {
    fixtureOrigin = await listen(fixture)
    origin = await listen(server)
  })
  after(async () => {
    await close(server)
    await close(fixture)
  })

  test('captures a full-page png at the requested width', async () => {
    const response = await fetch(`${origin}/api/screenshot?${new URLSearchParams({ url: fixtureOrigin, width: '800' })}`)
    assert.equal(response.status, 200)
    const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()))
    assert.equal(png.width, 800)
    assert.equal(png.height, PAGE_HEIGHT)
  })
})
