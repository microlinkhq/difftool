import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { findPrerenderProblem, findReadProblem } from '../lib/prerender.mjs'

const HOME_HTML = fileURLToPath(new URL('../.next/server/app/index.html', import.meta.url))

const fail = (problem) => {
  console.error(`check-prerender: ${problem}`)
  process.exit(1)
}

const html = await readFile(HOME_HTML, 'utf8').catch((error) => {
  const problem = findReadProblem(error)
  if (problem) fail(problem)
  throw error
})

const problem = findPrerenderProblem(html)
if (problem) fail(problem)

console.log('check-prerender: / is fully prerendered')
