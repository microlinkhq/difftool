import mql from '@microlink/mql'

const noop = () => {}

const formatBytes = bytes => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

const toApiHeaders = headers => {
  const result = {}
  for (const [key, value] of Object.entries(headers)) {
    result[`x-api-header-${key}`] = String(value)
  }
  return result
}

export const screenshot = async (url, { log = noop, ...opts } = {}) => {
  log(`→ requesting screenshot for ${url}`)
  const start = Date.now()
  const { screenshot: screenshotOpts, headers, ...rest } = opts
  const { data } = await mql(
    url,
    {
      waitForTimeout: 3000,
      meta: false,
      screenshot: { fullPage: true, type: 'png', ...screenshotOpts },
      ...rest
    },
    headers ? { headers: toApiHeaders(headers) } : undefined
  )
  log(`← microlink responded for ${url} in ${Date.now() - start}ms`)

  const imageUrl = data?.screenshot?.url
  if (!imageUrl) throw new Error(`Microlink returned no screenshot URL for ${url}`)

  log(`↓ downloading PNG from ${imageUrl}`)
  const dlStart = Date.now()
  const res = await fetch(imageUrl)
  if (!res.ok)
    throw new Error(`Failed to download screenshot for ${url}: ${res.status} ${res.statusText}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  log(`✓ downloaded ${formatBytes(buffer.length)} for ${url} in ${Date.now() - dlStart}ms`)

  return buffer
}
