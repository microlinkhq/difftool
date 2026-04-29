import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { composite } from './composite.js'
import { diff as runDiff } from './diff.js'
import { screenshot } from './microlink.js'

const DEFAULT_THRESHOLD = 0.001
const DEFAULT_PIXEL_THRESHOLD = 0.1
const DEFAULT_VIEWPORT = { width: 1280, height: 800 }
const DEFAULT_ROUTES = ['/']

const noop = () => {}

const readJson = async filePath => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

export const resolveThreshold = async ({ flag, cwd = process.cwd() } = {}) => {
  if (flag !== undefined && flag !== null) return Number(flag)
  if (process.env.MICROLINK_DIFF_THRESHOLD)
    return Number(process.env.MICROLINK_DIFF_THRESHOLD)
  const config = await readJson(path.join(cwd, 'microlink-difftool.json'))
  if (config && typeof config.threshold === 'number') return config.threshold
  return DEFAULT_THRESHOLD
}

const joinUrl = (origin, route) => {
  const base = origin.replace(/\/+$/, '')
  const suffix = route.startsWith('/') ? route : `/${route}`
  return `${base}${suffix}`
}

const slugifyRoute = route => {
  if (route === '/' || route === '') return 'root'
  return (
    route
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .toLowerCase() || 'root'
  )
}

const runRoute = async ({
  route,
  base,
  head,
  viewport,
  apiKey,
  threshold,
  pixelThreshold,
  outDir,
  log
}) => {
  const baseUrl = joinUrl(base, route)
  const headUrl = joinUrl(head, route)

  log(`[${route}] base: ${baseUrl}`)
  log(`[${route}] head: ${headUrl}`)

  const fetchStart = Date.now()
  const [baseBuffer, headBuffer] = await Promise.all([
    screenshot(baseUrl, {
      viewport,
      apiKey,
      log: msg => log(`[${route}] ${msg}`)
    }),
    screenshot(headUrl, {
      viewport,
      apiKey,
      log: msg => log(`[${route}] ${msg}`)
    })
  ])
  log(`[${route}] both screenshots ready in ${Date.now() - fetchStart}ms`)

  const diffStart = Date.now()
  const {
    diffBuffer,
    basePadded,
    headPadded,
    diffPixels,
    totalPixels,
    width,
    height
  } = runDiff(baseBuffer, headBuffer, { pixelThreshold })
  log(
    `[${route}] diff complete in ${
      Date.now() - diffStart
    }ms · canvas ${width}x${height} · ${diffPixels}/${totalPixels} pixels differ`
  )

  const ratio = diffPixels / totalPixels
  const passed = ratio <= threshold

  const compStart = Date.now()
  const reviewBuffer = await composite({
    baseBuffer: basePadded,
    headBuffer: headPadded,
    diffBuffer,
    baseUrl,
    headUrl,
    diffPixels,
    totalPixels,
    threshold,
    passed
  })
  log(`[${route}] composite rendered in ${Date.now() - compStart}ms`)

  await mkdir(outDir, { recursive: true })
  await Promise.all([
    writeFile(path.join(outDir, 'review.png'), reviewBuffer),
    writeFile(path.join(outDir, 'base.png'), baseBuffer),
    writeFile(path.join(outDir, 'head.png'), headBuffer),
    writeFile(path.join(outDir, 'diff.png'), diffBuffer)
  ])

  return {
    route,
    baseUrl,
    headUrl,
    diffPixels,
    totalPixels,
    diffRatio: ratio,
    passed,
    outDir
  }
}

export const run = async ({
  base,
  head,
  out,
  routes = DEFAULT_ROUTES,
  threshold,
  pixelThreshold = DEFAULT_PIXEL_THRESHOLD,
  viewport = DEFAULT_VIEWPORT,
  apiKey = process.env.MICROLINK_API_KEY,
  cwd = process.cwd(),
  log = noop
} = {}) => {
  if (!base) throw new Error('Missing required option: base')
  if (!head) throw new Error('Missing required option: head')
  if (!out) throw new Error('Missing required option: out')
  if (!Array.isArray(routes) || routes.length === 0)
    throw new Error('routes must be a non-empty array')

  const resolvedThreshold = await resolveThreshold({ flag: threshold, cwd })
  log(
    `threshold resolved: ${resolvedThreshold} (pixel-threshold: ${pixelThreshold})`
  )
  log(`viewport: ${viewport.width}x${viewport.height}`)
  log(`routes: ${routes.join(', ')}`)

  const outDir = path.resolve(cwd, out)
  await mkdir(outDir, { recursive: true })
  log(`writing outputs to ${outDir}`)

  const results = []
  for (const route of routes) {
    const slug = slugifyRoute(route)
    const routeDir = routes.length === 1 ? outDir : path.join(outDir, slug)
    log(`▶ route ${route} → ${routeDir}`)
    const result = await runRoute({
      route,
      base,
      head,
      viewport,
      apiKey,
      threshold: resolvedThreshold,
      pixelThreshold,
      outDir: routeDir,
      log
    })
    log(
      `◀ route ${route} ${result.passed ? 'PASS' : 'FAIL'} · ${(
        result.diffRatio * 100
      ).toFixed(2)}% changed`
    )
    results.push(result)
  }

  const passed = results.every(r => r.passed)
  const summary = {
    base,
    head,
    threshold: resolvedThreshold,
    pixelThreshold,
    viewport,
    passed,
    routes: results.map(({ outDir: routeOutDir, ...rest }) => ({
      ...rest,
      outDir: path.relative(outDir, routeOutDir) || '.'
    }))
  }
  await writeFile(
    path.join(outDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  )

  return { ...summary, outDir, results }
}
