const pct = ratio => `${(ratio * 100).toFixed(2)}%`

const stripProtocol = url => url.replace(/^https?:\/\//, '').replace(/\/+$/, '')

const slugFor = route => {
  if (!route.outDir || route.outDir === '.') return 'root'
  return route.outDir
}

const lookup = (assetUrls, slug, basename) => {
  const url = assetUrls[`${slug}/${basename}`]
  return url || null
}

const imgCell = (url, alt) =>
  url
    ? `<img src="${url}" width="280" alt="${alt}">`
    : `_(asset upload failed: ${alt})_`

const reviewLink = url =>
  url ? `<a href="${url}">open composite review</a>` : '_(review.png upload failed)_'

const routeSection = (route, assetUrls) => {
  const mark = route.passed ? '✓' : '✗'
  const open = route.passed ? '' : ' open'
  const slug = slugFor(route)
  const baseUrl = lookup(assetUrls, slug, 'base.png')
  const headUrl = lookup(assetUrls, slug, 'head.png')
  const diffUrl = lookup(assetUrls, slug, 'diff.png')
  const reviewUrl = lookup(assetUrls, slug, 'review.png')

  return [
    `<details${open}><summary><strong><code>${route.route}</code></strong> — ${pct(route.diffRatio)} changed ${mark}</summary>`,
    '',
    '| production | preview | diff |',
    '| --- | --- | --- |',
    `| ${imgCell(baseUrl, 'production')} | ${imgCell(headUrl, 'preview')} | ${imgCell(diffUrl, 'diff')} |`,
    '',
    `<sub>${reviewLink(reviewUrl)} · <a href="${route.headUrl}">${stripProtocol(route.headUrl)}</a></sub>`,
    '',
    '</details>'
  ].join('\n')
}

export const renderComment = (
  summary,
  { assetUrls, runUrl, marker = '<!-- microlink-difftool -->' } = {}
) => {
  if (!assetUrls || typeof assetUrls !== 'object') {
    throw new Error('renderComment: assetUrls map is required')
  }

  const total = summary.routes.length
  const failed = summary.routes.filter(r => !r.passed).length

  const heading = summary.passed
    ? `### 🖼 Visual diff · ✓ ${total}/${total} routes pass`
    : `### 🖼 Visual diff · ✗ ${failed}/${total} routes failed`

  const summaryTable = [
    '| Route | Diff | Verdict |',
    '| --- | --- | --- |',
    ...summary.routes.map(
      r => `| \`${r.route}\` | ${pct(r.diffRatio)} | ${r.passed ? '✓' : '✗'} |`
    )
  ].join('\n')

  const ordered = [
    ...summary.routes.filter(r => !r.passed),
    ...summary.routes.filter(r => r.passed)
  ]
  const sections = ordered.map(r => routeSection(r, assetUrls)).join('\n\n')

  const footerBits = [
    `threshold ${pct(summary.threshold)}`,
    `pixel-threshold ${summary.pixelThreshold}`,
    `base <a href="${summary.base}">${stripProtocol(summary.base)}</a>`,
    `head <a href="${summary.head}">${stripProtocol(summary.head)}</a>`
  ]
  if (runUrl) footerBits.push(`<a href="${runUrl}">workflow run</a>`)
  const footer = `<sub>${footerBits.join(' · ')}</sub>`

  return [marker, heading, '', summaryTable, '', sections, '', footer, ''].join('\n')
}
