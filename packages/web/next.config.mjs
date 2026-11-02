const CONTENT_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

const DENY_FRAMING_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
]

export const securityHeaders = (isProduction) => [...CONTENT_HEADERS, ...(isProduction ? DENY_FRAMING_HEADERS : [])]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'production') }]
  },
}

export default nextConfig
