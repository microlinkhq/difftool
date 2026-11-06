const LANDING_ELEMENT = /<main\b[^>]*\sid="main"/

const BOUNDARY_TOKEN = /<!--\$(!|\?)?-->|<!--\/\$-->/g
const CLOSE_TOKEN = '<!--/$-->'
const CLIENT_RENDERED_OPEN = '<!--$!-->'
const PENDING_OPEN = '<!--$?-->'

function isInsideReplacedBoundary(html, position) {
  const openBoundaries = []
  for (const { 0: token, index } of html.matchAll(BOUNDARY_TOKEN)) {
    if (index > position) break
    if (token === CLOSE_TOKEN) openBoundaries.pop()
    else openBoundaries.push(token === CLIENT_RENDERED_OPEN || token === PENDING_OPEN)
  }
  return openBoundaries.includes(true)
}

export function findPrerenderProblem(html) {
  const landingPosition = html.search(LANDING_ELEMENT)
  if (landingPosition === -1) {
    return 'the landing <main> is missing from the server HTML'
  }
  if (isInsideReplacedBoundary(html, landingPosition)) {
    return 'the landing sits in a Suspense boundary whose server HTML the client replaces, so React throws the server HTML away and remounts it after hydration'
  }
  return null
}

export function findReadProblem(error) {
  if (error.code === 'ENOENT') {
    return '/ was not prerendered as static HTML, so it renders on every request'
  }
  return null
}
