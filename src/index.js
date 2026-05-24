import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { composite } from './composite.js'
import { diff as runDiff } from './diff.js'
import { screenshot } from './microlink.js'

const DEFAULT_THRESHOLD = 0.001
const DEFAULT_WARNING_THRESHOLD = 0.02
const DEFAULT_PIXEL_THRESHOLD = 0.1
const DEFAULT_VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 2 }
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

export const resolveWarningThreshold = async ({ flag, cwd = process.cwd() } = {}) => {
  if (flag !== undefined && flag !== null) return Number(flag)
  if (process.env.MICROLINK_DIFF_WARNING_THRESHOLD)
    return Number(process.env.MICROLINK_DIFF_WARNING_THRESHOLD)
  const config = await readJson(path.join(cwd, 'microlink-difftool.json'))
  if (config && typeof config.warningThreshold === 'number') return config.warningThreshold
  return DEFAULT_WARNING_THRESHOLD
}

const computeVerdict = (ratio, threshold, warningThreshold) => {
  if (ratio <= threshold) return 'pass'
  if (ratio <= warningThreshold) return 'warning'
  return 'fail'
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
  threshold,
  warningThreshold,
  pixelThreshold,
  outDir,
  log,
  ...screenshotOpts
}) => {
  const baseUrl = joinUrl(base, route)
  const headUrl = joinUrl(head, route)

  log(`[${route}] base: ${baseUrl}`)
  log(`[${route}] head: ${headUrl}`)

  const fetchStart = Date.now()
  const [baseBuffer, headBuffer] = await Promise.all([
    screenshot(baseUrl, {
      ...screenshotOpts,
      log: msg => log(`[${route}] ${msg}`)
    }),
    screenshot(headUrl, {
      ...screenshotOpts,
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
  const verdict = computeVerdict(ratio, threshold, warningThreshold)
  const passed = verdict !== 'fail'

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
    warningThreshold,
    verdict,
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
    verdict,
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
  warningThreshold,
  pixelThreshold = DEFAULT_PIXEL_THRESHOLD,
  mql: mqlOpts = {},
  apiKey = process.env.MICROLINK_API_KEY,
  cwd = process.cwd(),
  log = noop
} = {}) => {
  if (!base) throw new Error('Missing required option: base')
  if (!head) throw new Error('Missing required option: head')
  if (!out) throw new Error('Missing required option: out')
  if (!Array.isArray(routes) || routes.length === 0)
    throw new Error('routes must be a non-empty array')

  const mql = {
    apiKey,
    ...mqlOpts,
    viewport: { ...DEFAULT_VIEWPORT, ...mqlOpts.viewport }
  }
  const resolvedThreshold = await resolveThreshold({ flag: threshold, cwd })
  const resolvedWarningThreshold = await resolveWarningThreshold({ flag: warningThreshold, cwd })
  log(
    `threshold resolved: ${resolvedThreshold} (warning: ${resolvedWarningThreshold}, pixel-threshold: ${pixelThreshold})`
  )
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
      ...mql,
      threshold: resolvedThreshold,
      warningThreshold: resolvedWarningThreshold,
      pixelThreshold,
      outDir: routeDir,
      log
    })
    log(
      `◀ route ${route} ${result.verdict.toUpperCase()} · ${(
        result.diffRatio * 100
      ).toFixed(2)}% changed`
    )
    results.push(result)
  }

  const hasFailures = results.some(r => r.verdict === 'fail')
  const hasWarnings = results.some(r => r.verdict === 'warning')
  const passed = !hasFailures
  const verdict = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass'
  const summary = {
    base,
    head,
    threshold: resolvedThreshold,
    warningThreshold: resolvedWarningThreshold,
    pixelThreshold,
    verdict,
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
