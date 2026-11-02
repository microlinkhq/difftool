import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import nextConfig, { securityHeaders } from '../next.config.mjs'

const asMap = headers => Object.fromEntries(headers.map(({ key, value }) => [key, value]))

describe('security headers', () => {
  test('production refuses framing and MIME sniffing', () => {
    const headers = asMap(securityHeaders(true))
    assert.equal(headers['Content-Security-Policy'], "frame-ancestors 'none'")
    assert.equal(headers['X-Frame-Options'], 'DENY')
    assert.equal(headers['X-Content-Type-Options'], 'nosniff')
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin')
  })

  test('development still refuses MIME sniffing but can be framed by live theme previews', () => {
    const headers = asMap(securityHeaders(false))
    assert.equal(headers['X-Content-Type-Options'], 'nosniff')
    assert.equal(headers['Content-Security-Policy'], undefined)
    assert.equal(headers['X-Frame-Options'], undefined)
  })

  test('the headers cover every path', async () => {
    const [rule] = await nextConfig.headers()
    assert.equal(rule.source, '/:path*')
  })
})
