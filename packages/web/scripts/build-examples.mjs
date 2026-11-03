import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const CLI_DIR = path.join(WEB_DIR, '../cli')
const OUT_DIR = path.join(WEB_DIR, 'public/examples')

const { createCanvas, loadImage } = createRequire(path.join(CLI_DIR, 'package.json'))('canvas')
const { composite } = await import(path.join(CLI_DIR, 'src/composite.js'))
const { slugFor } = await import(path.join(CLI_DIR, 'src/s3.js'))
const { highlightDifferences } = await import(path.join(WEB_DIR, 'lib/pixel-diff.ts'))
const { EXAMPLE_WIDTH_PX } = await import(path.join(WEB_DIR, 'lib/zoom.ts'))

const EXAMPLE_HEIGHT_PX = 900
const HIGHLIGHT_SIZE = { width: 1440, height: 440 }
const UNAVATAR_HERO_CROP = '317,84,805'
const REVIEW_SIZE = { width: 2400, height: 800 }
const REVIEW_COLUMN_HEIGHT_PX = 1400
const WEBP_QUALITY = '90'
const USAGE = `usage: node packages/web/scripts/build-examples.mjs <run-dir> [route] [left,top,width]

<run-dir>       summary.json plus <slug>-{base,head,diff}.png from one difftool run
[route]         the route to use, default /
[left,top,width] the highlight crop, in pixels of the ${EXAMPLE_WIDTH_PX}px-wide preview, default ${UNAVATAR_HERO_CROP} (the unavatar.io hero)`

const [runDir, routeName = '/', crop = UNAVATAR_HERO_CROP] = process.argv.slice(2)
if (!runDir) {
  console.error(USAGE)
  process.exit(1)
}

const readSummary = file => JSON.parse(readFileSync(file, 'utf8').replace(/<\/?(pre|code)>/g, ''))
const summary = readSummary(path.join(runDir, 'summary.json'))
const route = summary.routes.find(r => r.route === routeName)
if (!route) throw new Error(`route ${routeName} is not in summary.json`)
const [cropLeft, cropTop, cropWidth] = crop.split(',').map(Number)
if (![cropLeft, cropTop, cropWidth].every(Number.isFinite)) throw new Error(`crop must be left,top,width, got ${crop}`)

const magick = (...args) => execFileSync('magick', args, { stdio: 'inherit' })
const sizeOf = file => execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().split(' ').map(Number)
const outFile = name => path.join(OUT_DIR, name)
const screenshot = name => path.join(runDir, `${slugFor(route)}-${name}.png`)

const readCanvas = async file => {
  const image = await loadImage(readFileSync(file))
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  return { canvas, ctx, pixels: ctx.getImageData(0, 0, image.width, image.height) }
}

const build = async work => {
  const workFile = name => path.join(work, name)
  const nativeWidth = Math.max(...['base', 'head', 'diff'].map(name => sizeOf(screenshot(name))[0]))
  const toNative = previewPx => Math.round(previewPx * nativeWidth / EXAMPLE_WIDTH_PX)

  for (const name of ['base', 'head', 'diff']) {
    magick(screenshot(name), '-background', 'white', '-gravity', 'NorthWest', '-extent', `${nativeWidth}x`, workFile(`${name}.png`))
  }

  const firstScreen = (input, output) =>
    magick(input, '-resize', `${EXAMPLE_WIDTH_PX}x`, '-crop', `${EXAMPLE_WIDTH_PX}x${EXAMPLE_HEIGHT_PX}+0+0`, '+repage', '-quality', WEBP_QUALITY, output)
  firstScreen(workFile('base.png'), outFile('production.webp'))
  firstScreen(workFile('head.png'), outFile('preview.webp'))
  firstScreen(workFile('diff.png'), outFile('diff.webp'))

  const highlightWidth = toNative(cropWidth)
  const highlightHeight = Math.round(highlightWidth * HIGHLIGHT_SIZE.height / HIGHLIGHT_SIZE.width)
  const highlightGeometry = `${highlightWidth}x${highlightHeight}+${toNative(cropLeft)}+${toNative(cropTop)}`
  for (const name of ['base', 'head']) magick(workFile(`${name}.png`), '-crop', highlightGeometry, '+repage', workFile(`highlight-${name}.png`))
  const highlightBase = await readCanvas(workFile('highlight-base.png'))
  const highlightHead = await readCanvas(workFile('highlight-head.png'))
  highlightBase.pixels.data.set(highlightDifferences(highlightBase.pixels.data, highlightHead.pixels.data))
  highlightBase.ctx.putImageData(highlightBase.pixels, 0, 0)
  writeFileSync(workFile('highlight.png'), highlightBase.canvas.toBuffer('image/png'))
  magick(workFile('highlight.png'), '-resize', `${HIGHLIGHT_SIZE.width}x${HIGHLIGHT_SIZE.height}!`, '-quality', WEBP_QUALITY, outFile('highlight.webp'))

  for (const name of ['base', 'head', 'diff']) {
    magick(workFile(`${name}.png`), '-crop', `${nativeWidth}x${toNative(REVIEW_COLUMN_HEIGHT_PX)}+0+0`, '+repage', workFile(`review-${name}.png`))
  }
  writeFileSync(workFile('review.png'), await composite({
    baseBuffer: readFileSync(workFile('review-base.png')),
    headBuffer: readFileSync(workFile('review-head.png')),
    diffBuffer: readFileSync(workFile('review-diff.png')),
    baseUrl: route.baseUrl,
    headUrl: route.headUrl,
    diffPixels: route.diffPixels,
    totalPixels: route.totalPixels,
    threshold: summary.threshold,
    warningThreshold: summary.warningThreshold,
    verdict: route.verdict,
    passed: route.passed
  }))
  const [reviewWidth] = sizeOf(workFile('review.png'))
  const reviewTop = Math.round(reviewWidth * REVIEW_SIZE.height / REVIEW_SIZE.width)
  magick(workFile('review.png'), '-crop', `x${reviewTop}+0+0`, '+repage', '-resize', `${REVIEW_SIZE.width}x${REVIEW_SIZE.height}!`, '-quality', WEBP_QUALITY, outFile('review.webp'))
}

const work = mkdtempSync(path.join(tmpdir(), 'difftool-examples-'))
try {
  await build(work)
} finally {
  rmSync(work, { recursive: true, force: true })
}
console.log(`${route.route}: ${(route.diffRatio * 100).toFixed(2)}% ${route.verdict} -> ${OUT_DIR}`)
