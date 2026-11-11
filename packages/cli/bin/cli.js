#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { cac } from 'cac'

import { renderComment } from '../src/render-comment.js'
import * as s3 from '../src/s3.js'

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
  .option(
    '--warning-threshold <ratio>',
    'Max diff ratio for warning verdict (0..1). Changes between threshold and this are warnings, above are failures. Falls back to MICROLINK_DIFF_WARNING_THRESHOLD env or microlink-difftool.json'
  )
  .option('--pixel-threshold <ratio>', 'Per-pixel sensitivity (0..1)', {
    default: 0.1
  })
  .option('--mql <json>', 'JSON object with Microlink API options (viewport, styles, etc.)')
  .action(async opts => {
    if (!opts.base || !opts.head) {
      cli.outputHelp()
      process.exit(2)
    }

    const log = msg => console.error(`[microlink-difftool] ${msg}`)
    const routes = parseRoutes(opts.routes)
    const mql = opts.mql ? JSON.parse(opts.mql) : undefined

    try {
      const { run } = await import('../src/index.js')
      const result = await run({
        base: opts.base,
        head: opts.head,
        out: opts.out,
        routes,
        threshold:
          opts.threshold !== undefined ? Number(opts.threshold) : undefined,
        warningThreshold:
          opts.warningThreshold !== undefined ? Number(opts.warningThreshold) : undefined,
        pixelThreshold: Number(opts.pixelThreshold),
        mql,
        log
      })

      const verdictMarks = { pass: '✓', warning: '⚠', fail: '✗' }
      for (const r of result.results) {
        const mark = verdictMarks[r.verdict]
        const ratioPct = (r.diffRatio * 100).toFixed(2)
        const tail = r.verdict === 'fail'
          ? `review ${path.join(
              result.outDir,
              r.outDir === '.' ? '' : r.outDir,
              'review.png'
            )}`
          : r.verdict === 'warning'
            ? 'minor changes detected'
            : 'looks fine'
        console.log(
          `${mark} ${r.route} · ${ratioPct}% changed — ${tail}`
        )
      }

      const overallMark = verdictMarks[result.verdict]
      const failed = result.results.filter(r => r.verdict === 'fail').length
      const warned = result.results.filter(r => r.verdict === 'warning').length
      const parts = [`${result.results.length - failed - warned}/${result.results.length} routes pass`]
      if (warned) parts.push(`${warned} warning(s)`)
      if (failed) parts.push(`${failed} failed`)
      console.log(`${overallMark} overall: ${parts.join(', ')}`)

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
      const urls = await s3.uploadAssets({
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
      const deleted = await s3.cleanupPrefix({ config, keyPrefix: opts.keyPrefix })
      console.error(`cleanup-s3: deleted ${deleted} object(s) under ${opts.keyPrefix}/`)
    } catch (err) {
      console.error(`cleanup-s3: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'upload-upstash',
    'Upload screenshots to a public Upstash Blob bucket (token read from UPSTASH_BLOB_TOKEN) and emit a JSON URL map'
  )
  .option('--summary <path>', 'Path to summary.json from a diff run')
  .option('--out-dir <path>', 'Directory containing the per-route screenshots')
  .option(
    '--key-prefix <prefix>',
    'Object path prefix (e.g. "owner/repo/pr-106/<sha>")'
  )
  .option('--urls-out <path>', 'Where to write the slug/basename → URL JSON map')
  .action(async opts => {
    if (!opts.summary || !opts.outDir || !opts.keyPrefix || !opts.urlsOut) {
      console.error('upload-upstash: --summary, --out-dir, --key-prefix, --urls-out are all required')
      process.exit(2)
    }
    try {
      const upstash = await import('../src/upstash.js')
      const bucket = upstash.createBucket(process.env[upstash.TOKEN_ENV])
      const summary = JSON.parse(await readFile(opts.summary, 'utf8'))
      const urls = await upstash.uploadAssets({
        summary,
        outDir: opts.outDir,
        bucket,
        keyPrefix: opts.keyPrefix
      })
      await writeFile(opts.urlsOut, JSON.stringify(urls, null, 2))
      console.error(`upload-upstash: wrote ${Object.keys(urls).length} URLs to ${opts.urlsOut}`)
    } catch (err) {
      console.error(`upload-upstash: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'cleanup-upstash',
    'Delete all screenshots under a path prefix from an Upstash Blob bucket (token read from UPSTASH_BLOB_TOKEN)'
  )
  .option('--key-prefix <prefix>', 'Object path prefix to delete recursively')
  .action(async opts => {
    if (!opts.keyPrefix) {
      console.error('cleanup-upstash: --key-prefix is required')
      process.exit(2)
    }
    try {
      const upstash = await import('../src/upstash.js')
      const bucket = upstash.createBucket(process.env[upstash.TOKEN_ENV])
      await upstash.cleanupPrefix({ bucket, keyPrefix: opts.keyPrefix })
      console.error(`cleanup-upstash: deleted everything under ${opts.keyPrefix}/`)
    } catch (err) {
      console.error(`cleanup-upstash: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'upload-vercel',
    'Upload screenshots to a private Vercel Blob store (token read from BLOB_READ_WRITE_TOKEN) and emit a JSON map of presigned URLs'
  )
  .option('--summary <path>', 'Path to summary.json from a diff run')
  .option('--out-dir <path>', 'Directory containing the per-route screenshots')
  .option(
    '--key-prefix <prefix>',
    'Blob pathname prefix (e.g. "owner/repo/pr-106/<sha>")'
  )
  .option('--urls-out <path>', 'Where to write the slug/basename → URL JSON map')
  .option('--ttl-seconds <n>', 'Presigned URL lifetime in seconds, at most 7 days')
  .action(async opts => {
    if (!opts.summary || !opts.outDir || !opts.keyPrefix || !opts.urlsOut) {
      console.error('upload-vercel: --summary, --out-dir, --key-prefix, --urls-out are all required')
      process.exit(2)
    }
    let ttlSeconds
    if (opts.ttlSeconds !== undefined) {
      ttlSeconds = Number(opts.ttlSeconds)
      if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
        console.error('upload-vercel: --ttl-seconds must be a positive number of seconds')
        process.exit(2)
      }
    }
    try {
      const vercel = await import('../src/vercel.js')
      const store = vercel.createStore(process.env[vercel.TOKEN_ENV])
      const summary = JSON.parse(await readFile(opts.summary, 'utf8'))
      const urls = await vercel.uploadAssets({
        summary,
        outDir: opts.outDir,
        store,
        keyPrefix: opts.keyPrefix,
        ttlSeconds
      })
      await writeFile(opts.urlsOut, JSON.stringify(urls, null, 2))
      console.error(`upload-vercel: wrote ${Object.keys(urls).length} URLs to ${opts.urlsOut}`)
    } catch (err) {
      console.error(`upload-vercel: ${err.message}`)
      process.exit(2)
    }
  })

cli
  .command(
    'cleanup-vercel',
    'Delete all screenshots under a pathname prefix from a Vercel Blob store (token read from BLOB_READ_WRITE_TOKEN)'
  )
  .option('--key-prefix <prefix>', 'Blob pathname prefix to delete recursively')
  .action(async opts => {
    if (!opts.keyPrefix) {
      console.error('cleanup-vercel: --key-prefix is required')
      process.exit(2)
    }
    try {
      const vercel = await import('../src/vercel.js')
      const store = vercel.createStore(process.env[vercel.TOKEN_ENV])
      const deleted = await vercel.cleanupPrefix({ store, keyPrefix: opts.keyPrefix })
      console.error(`cleanup-vercel: deleted ${deleted} object(s) under ${opts.keyPrefix}/`)
    } catch (err) {
      console.error(`cleanup-vercel: ${err.message}`)
      process.exit(2)
    }
  })

export { cli }

const invokedAsCli = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
if (invokedAsCli) {
  cli.help()
  cli.parse()
}
