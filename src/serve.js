import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_VIEWPORT,
  VIEWPORT_HEIGHT_LIMITS,
  WAIT_FOR_TIMEOUT,
  clampHeight,
  clampWidth,
  isHttpUrl
} from '../web/lib.js'

export const WEB_ROOT = fileURLToPath(new URL('../web/', import.meta.url))
export const DEFAULT_PORT = 4321
export const DEFAULT_HOST = '127.0.0.1'

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'none'])

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

export const createBrowserlessCapture = () => {
  let browser
  const capture = async (url, { width, height, signal }) => {
    const { default: createBrowser } = await import('browserless')
    browser ??= createBrowser()
    const context = await browser.createContext()
    const destroy = () => context.destroyContext()
    signal?.addEventListener('abort', destroy, { once: true })
    try {
      return await context.screenshot(url, {
        type: 'png',
        fullPage: true,
        waitForTimeout: WAIT_FOR_TIMEOUT,
        viewport: { width, height, deviceScaleFactor: 1 }
      })
    } finally {
      signal?.removeEventListener('abort', destroy)
      if (!signal?.aborted) await destroy()
    }
  }
  capture.close = () => browser?.close()
  return capture
}

const isLoopbackHost = host => {
  if (!host) return false
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(`http://${host}`).hostname)
  } catch {
    return false
  }
}

const isTrustedApiRequest = req =>
  isLoopbackHost(req.headers.host) &&
  (req.headers['sec-fetch-site'] === undefined || TRUSTED_FETCH_SITES.has(req.headers['sec-fetch-site']))

const handleScreenshot = async (req, res, searchParams, capture) => {
  const url = searchParams.get('url')
  if (!isHttpUrl(url)) return sendJson(res, 400, { message: 'url must be an http(s) URL' })
  const width = clampWidth(searchParams.get('width') ?? DEFAULT_VIEWPORT.width)
  const height = clampHeight(searchParams.get('height') ?? VIEWPORT_HEIGHT_LIMITS.default)
  const controller = new AbortController()
  res.on('close', () => { if (!res.writableFinished) controller.abort() })
  try {
    const buffer = await capture(url, { width, height, signal: controller.signal })
    if (controller.signal.aborted) return
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
    res.end(buffer)
  } catch (error) {
    if (controller.signal.aborted) return
    sendJson(res, 502, { message: `Could not capture ${url}: ${error.message}` })
  }
}

const serveStatic = async (res, pathname, root) => {
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname)
  if (!file.startsWith(root)) return sendJson(res, 404, { message: 'not found' })
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) return sendJson(res, 404, { message: 'not found' })
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store'
  })
  createReadStream(file).pipe(res)
}

const parseRequestPath = rawUrl => {
  try {
    const { pathname, searchParams } = new URL(rawUrl, 'http://localhost')
    return { pathname: decodeURIComponent(pathname), searchParams }
  } catch {
    return null
  }
}

export const createServer = ({ capture = createBrowserlessCapture(), root = WEB_ROOT } = {}) => {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET') return sendJson(res, 405, { message: 'method not allowed' })
    const request = parseRequestPath(req.url)
    if (!request) return sendJson(res, 400, { message: 'malformed path' })
    const { pathname, searchParams } = request
    if (pathname.startsWith('/api/') && !isTrustedApiRequest(req)) {
      return sendJson(res, 403, { message: 'the local API only answers the difftool page on localhost' })
    }
    if (pathname === '/api/health') return sendJson(res, 200, { engine: 'local' })
    if (pathname === '/api/screenshot') return handleScreenshot(req, res, searchParams, capture)
    return serveStatic(res, pathname, root)
  })
  server.on('close', () => capture.close?.())
  return server
}

export const startServer = ({ port = DEFAULT_PORT, host = DEFAULT_HOST, ...options } = {}) =>
  new Promise((resolve, reject) => {
    const server = createServer(options)
    server.once('error', reject)
    server.listen(port, host, () => resolve(server))
  })
