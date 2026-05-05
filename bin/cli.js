#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { cac } from 'cac'

import { run } from '../src/index.js'
import { renderComment } from '../src/render-comment.js'
import { uploadAssets, cleanupPrefix } from '../src/s3.js'

const cli = cac('microlink-difftool')

const parseRoutes = value => {
  if (value === undefined || value === null) return ['/']
  if (Array.isArray(value)) {
    const normalizedRoutes = value
      .map(route => String(route).trim())
      .filter(Boolean)
    return normalizedRoutes.length > 0 ? normalizedRoutes : ['/']
  }

  const input = String(value).trim()
  let routes
  if (input.startsWith('[')) {
    routes = JSON.parse(input)
  } else {
    const lines = input
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    const isYamlList = lines.length > 0 && lines.every(line => line.startsWith('- '))
    if (!isYamlList) throw new Error('routes must be an array')

    routes = lines.map(line =>
      line
        .slice(2)
        .trim()
        .replace(/^['"]|['"]$/g, '')
    )
  }

  if (!Array.isArray(routes)) throw new Error('routes must be an array')
  const normalizedRoutes = routes.map(route => String(route).trim()).filter(Boolean)
  return normalizedRoutes.length > 0 ? normalizedRoutes : ['/']
}

cli
  .command('', 'Diff two URLs using Microlink full-page screenshots')
  .option('--base <url>', 'Production / baseline URL')
  .option('--head <url>', 'Preview URL to compare against base')
  .option(
    '--routes <path>',
    'Array of paths to diff (JSON array or YAML list string). Default: ["/"]'
  )
  .option('--out <dir>', 'Output directory', { default: './diff-output' })
  .option(
    '--threshold <ratio>',
    'Max acceptable diff ratio (0..1). Falls back to MICROLINK_DIFF_THRESHOLD env or microlink-difftool.json'
  )
  .option('--pixel-threshold <ratio>', 'Per-pixel sensitivity (0..1)', {
    default: 0.1
  })
  .option('--viewport-width <px>', 'Viewport width', { default: 1280 })
  .option('--viewport-height <px>', 'Viewport height', { default: 800 })
  .action(async opts => {
    if (!opts.base || !opts.head) {
      cli.outputHelp()
      process.exit(2)
    }

    const log = msg => console.error(`[microlink-difftool] ${msg}`)
    const routes = parseRoutes(opts.routes)

    try {
      const result = await run({
        base: opts.base,
        head: opts.head,
        out: opts.out,
        routes,
        threshold:
          opts.threshold !== undefined ? Number(opts.threshold) : undefined,
        pixelThreshold: Number(opts.pixelThreshold),
        viewport: {
          width: Number(opts.viewportWidth),
          height: Number(opts.viewportHeight)
        },
        log
      })

      const thresholdPct = (result.threshold * 100).toFixed(2)
      for (const r of result.results) {
        const mark = r.passed ? '✓' : '✗'
        const ratioPct = (r.diffRatio * 100).toFixed(2)
        const tail = r.passed
          ? 'looks fine'
          : `review ${path.join(
              result.outDir,
              r.outDir === '.' ? '' : r.outDir,
              'review.png'
            )}`
        console.log(
          `${mark} ${r.route} · ${ratioPct}% changed (threshold ${thresholdPct}%) — ${tail}`
        )
      }

      const overallMark = result.passed ? '✓' : '✗'
      const failed = result.results.filter(r => !r.passed).length
      console.log(
        `${overallMark} overall: ${result.results.length - failed}/${
          result.results.length
        } routes pass`
      )

      process.exit(result.passed ? 0 : 1)
    } catch (err) {
      console.error(`microlink-difftool: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'render-comment <summary>',
    'Render summary.json as a sticky PR-comment markdown body'
  )
  .option(
    '--asset-urls <path>',
    'JSON file mapping <slug>/<basename> → public URL'
  )
  .option('--run-url <url>', 'Optional workflow-run URL to link in the footer')
  .option(
    '--marker <html>',
    'HTML comment marker for sticky-comment matching',
    {
      default: '<!-- microlink-difftool -->'
    }
  )
  .action(async (summaryPath, opts) => {
    if (!opts.assetUrls) {
      console.error('render-comment: --asset-urls is required')
      process.exit(2)
    }
    try {
      const [summary, assetUrls] = await Promise.all([
        readFile(summaryPath, 'utf8').then(JSON.parse),
        readFile(opts.assetUrls, 'utf8').then(JSON.parse)
      ])
      const markdown = renderComment(summary, {
        assetUrls,
        runUrl: opts.runUrl,
        marker: opts.marker
      })
      process.stdout.write(markdown)
    } catch (err) {
      console.error(`render-comment: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'upload-s3',
    'Upload screenshots to an S3-compatible bucket and emit a JSON URL map'
  )
  .option('--summary <path>', 'Path to summary.json from a diff run')
  .option('--out-dir <path>', 'Directory containing the per-route screenshots')
  .option('--s3-config <path>', 'Path to a JSON file with S3 credentials')
  .option(
    '--key-prefix <prefix>',
    'Object key prefix (e.g. "owner/repo/pr-106/<sha>")'
  )
  .option('--urls-out <path>', 'Where to write the slug/basename → URL JSON map')
  .option('--ttl-seconds <n>', 'Pre-signed URL TTL in seconds')
  .action(async opts => {
    if (!opts.summary || !opts.outDir || !opts['s3-config'] || !opts.keyPrefix || !opts.urlsOut) {
      console.error('upload-s3: --summary, --out-dir, --s3-config, --key-prefix, --urls-out are all required')
      process.exit(2)
    }
    try {
      const [summary, config] = await Promise.all([
        readFile(opts.summary, 'utf8').then(JSON.parse),
        readFile(opts['s3-config'], 'utf8').then(JSON.parse)
      ])
      const urls = await uploadAssets({
        summary,
        outDir: opts.outDir,
        config,
        keyPrefix: opts.keyPrefix,
        ttlSeconds: opts.ttlSeconds !== undefined ? Number(opts.ttlSeconds) : undefined
      })
      await writeFile(opts.urlsOut, JSON.stringify(urls, null, 2))
      console.error(`upload-s3: wrote ${Object.keys(urls).length} URLs to ${opts.urlsOut}`)
    } catch (err) {
      console.error(`upload-s3: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'cleanup-s3',
    'Delete all screenshots under a key prefix from an S3-compatible bucket'
  )
  .option('--s3-config <path>', 'Path to a JSON file with S3 credentials')
  .option('--key-prefix <prefix>', 'Object key prefix to delete recursively')
  .action(async opts => {
    if (!opts['s3-config'] || !opts.keyPrefix) {
      console.error('cleanup-s3: --s3-config and --key-prefix are required')
      process.exit(2)
    }
    try {
      const config = JSON.parse(await readFile(opts['s3-config'], 'utf8'))
      const deleted = await cleanupPrefix({ config, keyPrefix: opts.keyPrefix })
      console.error(`cleanup-s3: deleted ${deleted} object(s) under ${opts.keyPrefix}/`)
    } catch (err) {
      console.error(`cleanup-s3: ${err.message}`)
      process.exit(2)
    }
  })

cli.help()
cli.parse()
