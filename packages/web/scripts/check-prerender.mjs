import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { findPrerenderProblem } from '../lib/prerender.mjs'

const HOME_HTML = fileURLToPath(new URL('../.next/server/app/index.html', import.meta.url))

const fail = (problem) => {
  console.error(`check-prerender: ${problem}`)
  process.exit(1)
}

const html = await readFile(HOME_HTML, 'utf8').catch((error) => {
  if (error.code === 'ENOENT') fail('/ was not prerendered as static HTML, so it renders on every request')
  throw error
})

const problem = findPrerenderProblem(html)
if (problem) fail(problem)

console.log('check-prerender: / is fully prerendered')
