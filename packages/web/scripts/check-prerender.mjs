import { readFile } from 'node:fs/promises'
import { findPrerenderProblem, findReadProblem } from '../lib/prerender.mjs'

const fail = (problem) => {
  console.error(`check-prerender: ${problem}`)
  process.exit(1)
}

const home = process.argv[2]
if (!home) fail('pass the path to the prerendered HTML')

const html = await readFile(home, 'utf8').catch((error) => {
  const problem = findReadProblem(error)
  if (problem) fail(problem)
  throw error
})

const problem = findPrerenderProblem(html)
if (problem) fail(problem)

console.log('check-prerender: / is fully prerendered')
