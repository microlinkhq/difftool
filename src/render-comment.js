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

const COMPARE_URL = 'https://microlink-difftool.vercel.app'

const openCell = url =>
  url ? `<a href="${url}">open</a>` : '<em>n/a</em>'

const compareCell = (baseUrl, headUrl) => {
  if (!baseUrl || !headUrl) return '<em>n/a</em>'
  const params = new URLSearchParams({ base: baseUrl, head: headUrl })
  return `<a href="${COMPARE_URL}/?${params}">compare</a>`
}

const routeRow = (route, assetUrls) => {
  const slug = slugFor(route)
  const baseUrl = lookup(assetUrls, slug, 'base.png')
  const headUrl = lookup(assetUrls, slug, 'head.png')
  const diffUrl = lookup(assetUrls, slug, 'diff.png')
  const verdict = route.passed ? '✅' : '❌'

  return [
    '    <tr>',
    `      <td><code>${route.route}</code></td>`,
    `      <td>${pct(route.diffRatio)}</td>`,
    `      <td>${openCell(baseUrl)}</td>`,
    `      <td>${openCell(headUrl)}</td>`,
    `      <td>${openCell(diffUrl)}</td>`,
    `      <td>${compareCell(baseUrl, headUrl)}</td>`,
    `      <td>${verdict}</td>`,
    '    </tr>'
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
  const passed = total - failed

  const verdictHeading = summary.passed
    ? `### ✅ ${passed}/${total} routes pass`
    : `### ❌ ${failed}/${total} routes failed`

  const metaBits = []
  if (runUrl) metaBits.push(`<a href="${runUrl}">workflow run</a>`)
  metaBits.push(`base <a href="${summary.base}">${stripProtocol(summary.base)}</a>`)
  metaBits.push(`head <a href="${summary.head}">${stripProtocol(summary.head)}</a>`)
  const metaBlock = [
    '<sub>',
    ...metaBits.map((b, i) => (i === 0 ? `  ${b}` : `  · ${b}`)),
    '</sub>'
  ].join('\n')

  const ordered = [
    ...summary.routes.filter(r => !r.passed),
    ...summary.routes.filter(r => r.passed)
  ]

  const routesTable = [
    '<table>',
    '  <thead>',
    '    <tr>',
    '      <th>Route</th>',
    '      <th>Changes</th>',
    '      <th>Production</th>',
    '      <th>Preview</th>',
    '      <th>Difference</th>',
    '      <th>Compare</th>',
    '      <th>Verdict</th>',
    '    </tr>',
    '  </thead>',
    '  <tbody>',
    ordered.map(r => routeRow(r, assetUrls)).join('\n'),
    '  </tbody>',
    '</table>'
  ].join('\n')

  const config = [
    '<details>',
    '  <summary>configuration</summary>',
    '',
    '<pre><code>' + JSON.stringify(summary, null, 2) + '</code></pre>',
    '',
    '</details>'
  ].join('\n')

  return [
    marker,
    '### @microlink/difftool visual comparison',
    '',
    metaBlock,
    '',
    verdictHeading,
    '',
    routesTable,
    '',
    config,
    ''
  ].join('\n')
}
