import { createCanvas, loadImage } from 'canvas'

const HEADER_HEIGHT = 64
const FOOTER_HEIGHT = 40
const SEPARATOR_WIDTH = 2
const PADDING_X = 16

const truncate = (str, max) => (str.length <= max ? str : `${str.slice(0, max - 1)}…`)

export const composite = async ({
  baseBuffer,
  headBuffer,
  diffBuffer,
  baseUrl,
  headUrl,
  diffPixels,
  totalPixels,
  threshold,
  passed
}) => {
  const [baseImg, headImg, diffImg] = await Promise.all([
    loadImage(baseBuffer),
    loadImage(headBuffer),
    loadImage(diffBuffer)
  ])

  const colWidth = baseImg.width
  const colHeight = baseImg.height
  const totalWidth = colWidth * 3 + SEPARATOR_WIDTH * 2
  const totalHeight = HEADER_HEIGHT + colHeight + FOOTER_HEIGHT

  const canvas = createCanvas(totalWidth, totalHeight)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0b0d10'
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  const columns = [
    { label: 'PRODUCTION', url: baseUrl, image: baseImg },
    { label: 'PREVIEW', url: headUrl, image: headImg },
    { label: 'DIFF', url: '', image: diffImg }
  ]

  columns.forEach((col, i) => {
    const x = i * (colWidth + SEPARATOR_WIDTH)

    ctx.fillStyle = '#11141a'
    ctx.fillRect(x, 0, colWidth, HEADER_HEIGHT)

    ctx.fillStyle = '#e5e7eb'
    ctx.font = 'bold 18px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(col.label, x + PADDING_X, 22)

    if (col.url) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '13px sans-serif'
      ctx.fillText(truncate(col.url, Math.floor((colWidth - PADDING_X * 2) / 7)), x + PADDING_X, 46)
    }

    ctx.drawImage(col.image, x, HEADER_HEIGHT)
  })

  ctx.fillStyle = '#1f2937'
  ctx.fillRect(colWidth, 0, SEPARATOR_WIDTH, HEADER_HEIGHT + colHeight)
  ctx.fillRect(colWidth * 2 + SEPARATOR_WIDTH, 0, SEPARATOR_WIDTH, HEADER_HEIGHT + colHeight)

  const footerY = HEADER_HEIGHT + colHeight
  ctx.fillStyle = passed ? '#064e3b' : '#7f1d1d'
  ctx.fillRect(0, footerY, totalWidth, FOOTER_HEIGHT)

  const ratio = diffPixels / totalPixels
  const verdict = passed
    ? `PASS · ${(ratio * 100).toFixed(2)}% changed (threshold ${(threshold * 100).toFixed(2)}%)`
    : `FAIL · ${(ratio * 100).toFixed(2)}% changed (threshold ${(threshold * 100).toFixed(2)}%) — review the diff column`

  ctx.fillStyle = '#f9fafb'
  ctx.font = 'bold 16px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(verdict, PADDING_X, footerY + FOOTER_HEIGHT / 2)

  return canvas.toBuffer('image/png')
}
