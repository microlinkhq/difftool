const pct = ratio => `${(ratio * 100).toFixed(2)}%`

const stripProtocol = url => url.replace(/^https?:\/\//, '').replace(/\/+$/, '')

const trimAssetBase = base => base.replace(/\/+$/, '')

const routeSection = (route, assetBase) => {
  const mark = route.passed ? '✓' : '✗'
  const open = route.passed ? '' : ' open'
  const dir = trimAssetBase(`${assetBase}/${route.outDir}`)

  return [
    `<details${open}><summary><strong><code>${
      route.route
    }</code></strong> — ${pct(route.diffRatio)} changed ${mark}</summary>`,
    '',
    '| production | preview | diff |',
    '| --- | --- | --- |',
    `| <img src="${dir}/base.png" width="280"> | <img src="${dir}/head.png" width="280"> | <img src="${dir}/diff.png" width="280"> |`,
    '',
    `<sub><a href="${dir}/review.png">open composite review</a> · <a href="${
      route.headUrl
    }">${stripProtocol(route.headUrl)}</a></sub>`,
    '',
    '</details>'
  ].join('\n')
}

export const renderComment = (
  summary,
  { assetBase, runUrl, marker = '<!-- microlink-difftool -->' } = {}
) => {
  if (!assetBase) throw new Error('renderComment: assetBase is required')

  const total = summary.routes.length
  const failed = summary.routes.filter(r => !r.passed).length
  const passed = total - failed

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
  const sections = ordered.map(r => routeSection(r, assetBase)).join('\n\n')

  const footerBits = [
    `threshold ${pct(summary.threshold)}`,
    `pixel-threshold ${summary.pixelThreshold}`,
    `base <a href="${summary.base}">${stripProtocol(summary.base)}</a>`,
    `head <a href="${summary.head}">${stripProtocol(summary.head)}</a>`
  ]
  if (runUrl) footerBits.push(`<a href="${runUrl}">workflow run</a>`)
  const footer = `<sub>${footerBits.join(' · ')}</sub>`

  return [marker, heading, '', summaryTable, '', sections, '', footer, ''].join(
    '\n'
  )
}
