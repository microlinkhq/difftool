import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const summary = {
  routes: [
    { route: '/', outDir: 'root' },
    { route: '/pricing', outDir: 'pricing' }
  ]
}

export const UPLOADED_KEYS = [
  'pricing/base.png',
  'pricing/head.png',
  'root/base.png',
  'root/diff.png',
  'root/head.png',
  'root/review.png'
]

export const writeScreenshots = async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'difftool-screenshots-'))
  await mkdir(path.join(outDir, 'root'))
  await mkdir(path.join(outDir, 'pricing'))
  for (const basename of ['base.png', 'head.png', 'diff.png', 'review.png']) {
    await writeFile(path.join(outDir, 'root', basename), `root-${basename}`)
  }
  await writeFile(path.join(outDir, 'pricing', 'base.png'), 'pricing-base.png')
  await writeFile(path.join(outDir, 'pricing', 'head.png'), 'pricing-head.png')
  return { outDir, remove: () => rm(outDir, { recursive: true, force: true }) }
}
