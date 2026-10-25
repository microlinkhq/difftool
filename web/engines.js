import { DEFAULT_VIEWPORT, WAIT_FOR_TIMEOUT } from './lib.js'

const MICROLINK_FREE_ENDPOINT = 'https://api.microlink.io/'
const MICROLINK_PRO_ENDPOINT = 'https://pro.microlink.io/'

const readError = async response => {
  try {
    const body = await response.json()
    return body.message || `${response.status} ${response.statusText}`
  } catch {
    return `${response.status} ${response.statusText}`
  }
}

const fetchBlob = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(await readError(response))
  return response.blob()
}

const localEngine = {
  id: 'local',
  label: 'Local Chromium',
  capture: (url, { width, height = DEFAULT_VIEWPORT.height, signal }) =>
    fetchBlob(`/api/screenshot?${new URLSearchParams({ url, width, height })}`, { signal })
}

const microlinkEngine = {
  id: 'microlink',
  label: 'Microlink API',
  capture: async (url, { width, height = DEFAULT_VIEWPORT.height, apiKey, signal }) => {
    const params = new URLSearchParams({
      url,
      screenshot: 'true',
      meta: 'false',
      'screenshot.fullPage': 'true',
      'screenshot.type': 'png',
      'viewport.width': String(width),
      'viewport.height': String(height),
      'viewport.deviceScaleFactor': '1',
      waitForTimeout: String(WAIT_FOR_TIMEOUT)
    })
    const endpoint = apiKey ? MICROLINK_PRO_ENDPOINT : MICROLINK_FREE_ENDPOINT
    const response = await fetch(`${endpoint}?${params}`, {
      signal,
      headers: apiKey ? { 'x-api-key': apiKey } : {}
    })
    const body = await response.json().catch(() => ({}))
    const screenshotUrl = body?.data?.screenshot?.url
    if (body.status !== 'success' || !screenshotUrl) {
      throw new Error(body.message || `Microlink returned no screenshot for ${url}`)
    }
    return fetchBlob(screenshotUrl, { signal })
  }
}

export const detectEngine = async () => {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' })
    if (response.ok && (await response.json()).engine === localEngine.id) return localEngine
  } catch {}
  return microlinkEngine
}

export const loadImage = fetchBlob
