import { diffImages } from './compare.js'
import { detectEngine, loadImage } from './engines.js'
import {
  DEFAULT_THRESHOLD,
  ZOOM_LIMITS,
  DEFAULT_WARNING_THRESHOLD,
  clampWidth,
  computeVerdict,
  fileLabel,
  isHttpUrl,
  isImageUrl,
  joinUrl,
  parseRoutes,
  parseZoom,
  pointerPercent,
  readQuery,
  stepZoom,
  toPercent,
  writeQuery
} from './lib.js'

const API_KEY_STORAGE = 'microlink-difftool:api-key'
const MODES = [
  ['split', 'Side by side'],
  ['slider', 'Slider'],
  ['fade', 'Fade'],
  ['highlight', 'Highlight'],
  ['subtract', 'Subtract']
]
const DEFAULT_MODE = 'split'
const DEFAULT_RANGE = 50
const IMAGE_PAIR_ROUTE = 'images'
const SIDES = ['base', 'head']

const $ = id => document.getElementById(id)
const form = $('form')
const fields = { base: $('base'), head: $('head'), routes: $('routes'), width: $('width'), apiKey: $('api-key') }
const files = { base: $('base-file'), head: $('head-file') }
const ui = { engine: $('engine'), submit: $('submit'), error: $('form-error'), results: $('results'), rows: $('rows'), viewer: $('viewer'), apiKeyField: $('api-key-field') }

const storage = {
  read: () => { try { return localStorage.getItem(API_KEY_STORAGE) || '' } catch { return '' } },
  write: value => { try { value ? localStorage.setItem(API_KEY_STORAGE, value) : localStorage.removeItem(API_KEY_STORAGE) } catch {} }
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const enginePromise = detectEngine()
const state = { run: null, results: [], selected: null, mode: DEFAULT_MODE, range: DEFAULT_RANGE, zoom: null }

const readViewParams = () => {
  const params = new URLSearchParams(location.search)
  const mode = params.get('mode')
  return {
    selected: params.get('view'),
    mode: MODES.some(([id]) => id === mode) ? mode : null,
    zoom: parseZoom(params.get('zoom'))
  }
}

const syncViewParams = () => {
  const params = new URLSearchParams(location.search)
  state.selected ? params.set('view', state.selected) : params.delete('view')
  state.mode !== DEFAULT_MODE ? params.set('mode', state.mode) : params.delete('mode')
  state.zoom ? params.set('zoom', String(state.zoom)) : params.delete('zoom')
  history.replaceState(null, '', `?${params}`)
}

const fillForm = query => {
  fields.base.value = query.base
  fields.head.value = query.head
  fields.routes.value = query.routes.join('\n')
  fields.width.value = query.width
}

const readForm = () => ({
  base: fields.base.value.trim(),
  head: fields.head.value.trim(),
  routes: parseRoutes(fields.routes.value),
  width: clampWidth(fields.width.value)
})

const validate = ({ base, head }) => {
  if (!isHttpUrl(base)) return { field: fields.base, message: 'Base URL must start with http:// or https://' }
  if (!isHttpUrl(head)) return { field: fields.head, message: 'Head URL must start with http:// or https://' }
  return null
}

const pairLabel = (base, head) => `${base} ⟷ ${head}`

const planComparisons = ({ base, head, routes }) =>
  isImageUrl(base) && isImageUrl(head)
    ? [{ route: IMAGE_PAIR_ROUTE, label: pairLabel(fileLabel(base), fileLabel(head)), baseName: fileLabel(base), headName: fileLabel(head), baseUrl: base, headUrl: head, direct: true }]
    : routes.map(route => ({ route, baseUrl: joinUrl(base, route), headUrl: joinUrl(head, route), direct: false }))

const planFileComparison = ({ base, head }) =>
  [{ route: IMAGE_PAIR_ROUTE, label: pairLabel(base.name, head.name), baseName: base.name, headName: head.name, baseUrl: base.name, headUrl: head.name, baseFile: base, headFile: head }]

const revokeResults = () => {
  for (const result of state.results) {
    for (const key of ['baseSrc', 'headSrc', 'diffSrc']) if (result[key]) URL.revokeObjectURL(result[key])
  }
}

const verdictBadge = verdict => verdict ? `<span class="verdict ${verdict}">${verdict}</span>` : ''
const openLink = (src, label) => src ? `<a href="${src}" target="_blank" rel="noopener">${label}</a>` : ''

const renderRows = () => {
  ui.rows.innerHTML = state.results.map(result => `<tr aria-current="${result.route === state.selected}">
    <td><code>${escapeHtml(result.label ?? result.route)}</code></td>
    <td class="status${result.error ? ' error' : ''}">${escapeHtml(result.error || result.status)}</td>
    <td class="num">${result.ratio === undefined ? '' : toPercent(result.ratio)}</td>
    <td>${verdictBadge(result.verdict)}</td>
    <td>${openLink(result.baseSrc, 'open')}</td>
    <td>${openLink(result.headSrc, 'open')}</td>
    <td>${openLink(result.diffSrc, 'open')}</td>
    <td>${result.diffSrc ? `<button type="button" class="link-button" data-select="${escapeHtml(result.route)}">compare</button>` : ''}</td>
  </tr>`).join('')
}

const modeButtons = () => `<div class="group" role="group" aria-label="View mode">${MODES.map(([id, label]) =>
  `<button type="button" data-mode="${id}" aria-pressed="${id === state.mode}">${label}</button>`).join('')}</div>`

const zoomButtons = () => `<div class="group" role="group" aria-label="Zoom">
    <button type="button" data-zoom="out" aria-label="Zoom out"${state.zoom === ZOOM_LIMITS.min ? ' disabled' : ''}>−</button>
    <button type="button" data-zoom="fit" aria-label="${state.zoom ? `${state.zoom}%, fit to width` : 'Fit to width'}" aria-pressed="${!state.zoom}" class="zoom-value">${state.zoom ? `${state.zoom}%` : 'Fit'}</button>
    <button type="button" data-zoom="in" aria-label="Zoom in"${state.zoom === ZOOM_LIMITS.max ? ' disabled' : ''}>+</button>
  </div>`

const rangeControl = () => {
  if (state.mode !== 'slider' && state.mode !== 'fade') return ''
  const label = state.mode === 'slider' ? 'Base ⟷ Head' : 'Head opacity'
  return `<label class="range">${label} <input type="range" min="0" max="100" value="${state.range}" id="range" /></label>`
}

const zoomedWidth = size => state.zoom ? `width: ${(size.width * state.zoom) / 100}px` : ''

const viewerBody = result => {
  const alt = side => `${side} screenshot of ${escapeHtml(result.route)}`
  if (state.mode === 'split') {
    const columns = state.zoom
      ? ` style="grid-template-columns: ${[result.baseSize, result.headSize, result].map(size => `${(size.width * state.zoom) / 100}px`).join(' ')}"`
      : ''
    const caption = side => `<small title="${escapeHtml(result[`${side}Url`])}">${escapeHtml(result[`${side}Name`] ?? result[`${side}Url`])}</small>`
    return `<div class="cols${state.zoom ? ' zoomed' : ''}"${columns}>
      <div class="col"><h3>BASE${caption('base')}</h3><img src="${result.baseSrc}" alt="${alt('Base')}" style="${zoomedWidth(result.baseSize)}" /></div>
      <div class="col"><h3>HEAD${caption('head')}</h3><img src="${result.headSrc}" alt="${alt('Head')}" style="${zoomedWidth(result.headSize)}" /></div>
      <div class="col"><h3>DIFF<small>changed pixels in red</small></h3><img src="${result.diffSrc}" alt="Pixel difference for ${escapeHtml(result.route)}" style="${zoomedWidth(result)}" /></div>
    </div>`
  }
  const stackStyle = state.zoom
    ? `${zoomedWidth(result)}; aspect-ratio: ${result.width} / ${result.height}`
    : `max-width: ${result.width}px; aspect-ratio: ${result.width} / ${result.height}`
  const widthOf = size => `width: ${(size.width / result.width) * 100}%`
  if (state.mode === 'highlight') {
    return `<div class="pan"><div class="stack" style="${stackStyle}"><img class="layer" src="${result.diffSrc}" alt="Pixel difference for ${escapeHtml(result.route)}" style="width: 100%" /></div></div>`
  }
  const topStyle = state.mode === 'slider'
    ? `clip-path: inset(0 0 0 ${state.range}%)`
    : state.mode === 'fade' ? `opacity: ${state.range / 100}` : ''
  return `<div class="pan"><div class="stack ${state.mode}${state.mode === 'subtract' ? ' difference' : ''}" style="${stackStyle}">
    <img class="layer" src="${result.baseSrc}" alt="${alt('Base')}" style="${widthOf(result.baseSize)}" draggable="false" />
    <img class="layer top" src="${result.headSrc}" alt="${alt('Head')}" style="${widthOf(result.headSize)}; ${topStyle}" draggable="false" />
    ${state.mode === 'slider' ? `<div class="handle" style="left: ${state.range}%"></div>` : ''}
  </div></div>`
}

const selectedResult = () => state.results.find(r => r.route === state.selected && r.diffSrc)

const renderViewer = () => {
  const result = selectedResult()
  ui.viewer.hidden = !result
  if (!result) { ui.viewer.innerHTML = ''; return }
  ui.viewer.innerHTML = `<div class="toolbar">
      <code>${escapeHtml(result.label ?? result.route)}</code>
      ${modeButtons()}
      ${zoomButtons()}
      ${rangeControl()}
      <span>${toPercent(result.ratio)} changed ${verdictBadge(result.verdict)}</span>
    </div>${viewerBody(result)}`
}

const render = () => {
  ui.results.hidden = state.results.length === 0
  renderRows()
  renderViewer()
}

const update = (result, patch) => {
  Object.assign(result, patch)
  ui.results.hidden = false
  renderRows()
  if (result.route === state.selected) renderViewer()
}

const selectionIsUsable = () => {
  const current = state.results.find(r => r.route === state.selected)
  return Boolean(current) && !current.error
}

const selectRoute = route => {
  state.selected = route
  syncViewParams()
  renderRows()
  renderViewer()
}

const selectFirstComparison = () => {
  const first = state.results.find(r => r.diffSrc)
  if (first) selectRoute(first.route)
}

const captureSide = async (comparison, side, options) => {
  const file = comparison[`${side}File`]
  if (file) return file
  const url = comparison[`${side}Url`]
  return comparison.direct ? loadImage(url, options) : (await enginePromise).capture(url, options)
}

const runComparison = async (result, { width, signal }) => {
  const options = { width, signal, apiKey: fields.apiKey.value.trim() }
  update(result, { status: 'Capturing both screenshots…' })
  const [baseBlob, headBlob] = await Promise.all(SIDES.map(side => captureSide(result, side, options)))
  if (signal.aborted) return
  update(result, { status: 'Comparing pixels…' })
  const { diffPixels, totalPixels, width: diffWidth, height: diffHeight, baseSize, headSize, diffBlob } = await diffImages(baseBlob, headBlob)
  if (signal.aborted) return
  const ratio = diffPixels / totalPixels
  update(result, {
    status: `${diffPixels.toLocaleString()} of ${totalPixels.toLocaleString()} pixels changed`,
    ratio,
    verdict: computeVerdict(ratio, DEFAULT_THRESHOLD, DEFAULT_WARNING_THRESHOLD),
    width: diffWidth,
    height: diffHeight,
    baseSize,
    headSize,
    baseSrc: URL.createObjectURL(baseBlob),
    headSrc: URL.createObjectURL(headBlob),
    diffSrc: URL.createObjectURL(diffBlob)
  })
  if (!selectionIsUsable()) selectRoute(result.route)
}

const run = async (comparisons, { width }) => {
  state.run?.abort()
  const controller = new AbortController()
  state.run = controller
  revokeResults()
  state.results = comparisons.map(comparison => ({ ...comparison, status: 'Queued' }))
  const view = readViewParams()
  state.selected = state.results.some(r => r.route === view.selected) ? view.selected : null
  state.mode = view.mode ?? state.mode
  state.zoom = view.zoom ?? state.zoom
  if (!state.selected) syncViewParams()
  ui.submit.setAttribute('aria-busy', 'true')
  render()
  for (const result of state.results) {
    if (controller.signal.aborted) return
    try {
      await runComparison(result, { width, signal: controller.signal })
    } catch (error) {
      if (controller.signal.aborted) return
      update(result, { error: error.message })
      if (!selectionIsUsable()) selectFirstComparison()
    }
  }
  if (state.run === controller) ui.submit.removeAttribute('aria-busy')
}

form.addEventListener('submit', event => {
  event.preventDefault()
  const query = readForm()
  const invalid = validate(query)
  ui.error.textContent = invalid ? invalid.message : ''
  if (invalid) { invalid.field.focus(); return }
  storage.write(fields.apiKey.value.trim())
  history.pushState(null, '', writeQuery(query))
  run(planComparisons(query), query)
})

const chosenFile = side => files[side].files[0]

const showChosenFile = side => {
  const name = files[side].closest('.drop').querySelector('.file-name')
  name.textContent = chosenFile(side)?.name ?? 'Drop an image or choose a file'
}

const isImageFile = file => file.type.startsWith('image/')

const compareFiles = () => {
  const [base, head] = SIDES.map(chosenFile)
  if (!base || !head) return
  const notImage = [base, head].find(file => !isImageFile(file))
  ui.error.textContent = notImage ? `${notImage.name} is not an image` : ''
  if (notImage) return
  history.pushState({ files: true }, '', location.pathname)
  run(planFileComparison({ base, head }), { width: clampWidth(fields.width.value) })
}

for (const side of SIDES) {
  const input = files[side]
  const drop = input.closest('.drop')
  input.addEventListener('change', () => { showChosenFile(side); compareFiles() })
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('over') })
  drop.addEventListener('dragleave', event => { if (!drop.contains(event.relatedTarget)) drop.classList.remove('over') })
  drop.addEventListener('drop', event => {
    event.preventDefault()
    drop.classList.remove('over')
    if (!event.dataTransfer.files.length) return
    input.files = event.dataTransfer.files
    input.dispatchEvent(new Event('change'))
  })
}

for (const type of ['dragover', 'drop']) {
  addEventListener(type, event => { if (!event.target.closest?.('.drop')) event.preventDefault() })
}

ui.rows.addEventListener('click', event => {
  const button = event.target.closest('[data-select]')
  if (!button) return
  selectRoute(button.dataset.select)
  ui.viewer.scrollIntoView({ block: 'start' })
})

const fitPercent = result => {
  const rendered = ui.viewer.querySelector('.cols img, .stack')
  return rendered ? (rendered.getBoundingClientRect().width / (rendered.naturalWidth || result.width)) * 100 : 100
}

const nextZoom = (action, result) => {
  if (action === 'fit') return null
  return stepZoom(state.zoom ?? fitPercent(result), action === 'in' ? 1 : -1)
}

const rerenderKeepingFocus = selector => {
  syncViewParams()
  renderViewer()
  const target = ui.viewer.querySelector(`${selector}:not([disabled])`) ?? ui.viewer.querySelector('[data-zoom="fit"]')
  target?.focus()
}

ui.viewer.addEventListener('click', event => {
  const modeButton = event.target.closest('[data-mode]')
  if (modeButton) {
    state.mode = modeButton.dataset.mode
    rerenderKeepingFocus(`[data-mode="${state.mode}"]`)
    return
  }
  const zoomButton = event.target.closest('[data-zoom]')
  if (zoomButton) {
    const action = zoomButton.dataset.zoom
    state.zoom = nextZoom(action, selectedResult())
    rerenderKeepingFocus(`[data-zoom="${action}"]`)
  }
})

const applyRange = value => {
  state.range = value
  const top = ui.viewer.querySelector('img.top')
  if (!top) return
  const range = ui.viewer.querySelector('#range')
  if (range) range.value = String(Math.round(value))
  if (state.mode === 'slider') {
    top.style.clipPath = `inset(0 0 0 ${value}%)`
    ui.viewer.querySelector('.handle').style.left = `${value}%`
  } else {
    top.style.opacity = String(value / 100)
  }
}

ui.viewer.addEventListener('input', event => {
  if (event.target.id === 'range') applyRange(Number(event.target.value))
})

const slideTo = (stack, clientX) => applyRange(pointerPercent(clientX, stack.getBoundingClientRect()))

const startsDrag = event =>
  event.isPrimary && event.button === 0 && (event.pointerType === 'mouse' || event.target.closest('.handle'))

ui.viewer.addEventListener('pointerdown', event => {
  const stack = event.target.closest('.stack.slider')
  if (!stack || !startsDrag(event)) return
  event.preventDefault()
  stack.setPointerCapture(event.pointerId)
  slideTo(stack, event.clientX)
  const move = moveEvent => { if (moveEvent.pointerId === event.pointerId) slideTo(stack, moveEvent.clientX) }
  const release = () => {
    stack.removeEventListener('pointermove', move)
    stack.removeEventListener('lostpointercapture', release)
  }
  stack.addEventListener('pointermove', move)
  stack.addEventListener('lostpointercapture', release)
})

const clearResults = () => {
  state.run?.abort()
  revokeResults()
  state.results = []
  state.selected = null
  ui.submit.removeAttribute('aria-busy')
  render()
}

const startFromUrl = () => {
  const query = readQuery(location.search)
  fillForm(query)
  if (isHttpUrl(query.base) && isHttpUrl(query.head)) run(planComparisons(query), query)
  else clearResults()
}

addEventListener('popstate', startFromUrl)

const boot = async () => {
  fields.apiKey.value = storage.read()
  startFromUrl()
  const engine = await enginePromise
  ui.engine.textContent = engine.label
  ui.engine.dataset.engine = engine.id
  ui.apiKeyField.hidden = engine.id !== 'microlink'
}

boot()
