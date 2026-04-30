#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cac } from 'cac'

import { run } from '../src/index.js'
import { renderComment } from '../src/render-comment.js'

const cli = cac('microlink-difftool')

const parseRoutes = value => {
  if (value === undefined || value === null) return ['/']
  const list = Array.isArray(value) ? value : [value]
  const flat = list
    .flatMap(v => String(v).split(','))
    .map(v => v.trim())
    .filter(Boolean)
  return flat.length > 0 ? flat : ['/']
}

cli
  .command('', 'Diff two URLs using Microlink full-page screenshots')
  .option('--base <url>', 'Production / baseline URL')
  .option('--head <url>', 'Preview URL to compare against base')
  .option(
    '--routes <path>',
    'Path(s) to diff. Repeatable or comma-separated. Default: /'
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

cli.help()
cli.parse()
