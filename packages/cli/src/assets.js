import fs from 'node:fs/promises'
import path from 'node:path'

const FILES = ['base.png', 'head.png', 'diff.png', 'review.png']

export const slugFor = route => {
  if (!route.outDir || route.outDir === '.') return 'root'
  return route.outDir
}

export const joinPath = (...segments) => segments.join('/').split('/').filter(Boolean).join('/')

const routeDirFor = (outDir, route) =>
  !route.outDir || route.outDir === '.' ? outDir : path.join(outDir, route.outDir)

const readIfPresent = async filePath => {
  try {
    return await fs.readFile(filePath)
  } catch (err) {
    if (err.code === 'ENOENT') return undefined
    throw err
  }
}

export async function * screenshotAssets ({ summary, outDir }) {
  for (const route of summary.routes) {
    const slug = slugFor(route)
    const routeDir = routeDirFor(outDir, route)
    for (const basename of FILES) {
      const body = await readIfPresent(path.join(routeDir, basename))
      if (body === undefined) continue
      yield { slug, basename, body, urlKey: `${slug}/${basename}` }
    }
  }
}
