import { diffImages } from './compare.js'
import { detectEngine, loadImage } from './engines.js'
import {
  DEFAULT_THRESHOLD,
  DEFAULT_WARNING_THRESHOLD,
  clampWidth,
  computeVerdict,
  isHttpUrl,
  isImageUrl,
  joinUrl,
  parseRoutes,
  readQuery,
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

const $ = id => document.getElementById(id)
const form = $('form')
const fields = { base: $('base'), head: $('head'), routes: $('routes'), width: $('width'), apiKey: $('api-key') }
const ui = { engine: $('engine'), submit: $('submit'), error: $('form-error'), results: $('results'), rows: $('rows'), viewer: $('viewer'), apiKeyField: $('api-key-field') }

const storage = {
  read: () => { try { return localStorage.getItem(API_KEY_STORAGE) || '' } catch { return '' } },
  write: value => { try { value ? localStorage.setItem(API_KEY_STORAGE, value) : localStorage.removeItem(API_KEY_STORAGE) } catch {} }
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const enginePromise = detectEngine()
const state = { run: null, results: [], selected: null, mode: DEFAULT_MODE, range: DEFAULT_RANGE }

const readViewParams = () => {
  const params = new URLSearchParams(location.search)
  const mode = params.get('mode')
  return { selected: params.get('view'), mode: MODES.some(([id]) => id === mode) ? mode : DEFAULT_MODE }
}

const syncViewParams = () => {
  const params = new URLSearchParams(location.search)
  state.selected ? params.set('view', state.selected) : params.delete('view')
  state.mode !== DEFAULT_MODE ? params.set('mode', state.mode) : params.delete('mode')
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

const planComparisons = ({ base, head, routes }) =>
  isImageUrl(base) && isImageUrl(head)
    ? [{ route: IMAGE_PAIR_ROUTE, baseUrl: base, headUrl: head, direct: true }]
    : routes.map(route => ({ route, baseUrl: joinUrl(base, route), headUrl: joinUrl(head, route), direct: false }))

const revokeResults = () => {
  for (const result of state.results) {
    for (const key of ['baseSrc', 'headSrc', 'diffSrc']) if (result[key]) URL.revokeObjectURL(result[key])
  }
}

const verdictBadge = verdict => verdict ? `<span class="verdict ${verdict}">${verdict}</span>` : ''
const openLink = (src, label) => src ? `<a href="${src}" target="_blank" rel="noopener">${label}</a>` : ''

const renderRows = () => {
  ui.rows.innerHTML = state.results.map(result => `<tr aria-current="${result.route === state.selected}">
    <td><code>${escapeHtml(result.route)}</code></td>
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

const rangeControl = () => {
  if (state.mode !== 'slider' && state.mode !== 'fade') return ''
  const label = state.mode === 'slider' ? 'Base ⟷ Head' : 'Head opacity'
  return `<label class="range">${label} <input type="range" min="0" max="100" value="${state.range}" id="range" /></label>`
}

const viewerBody = result => {
  const alt = side => `${side} screenshot of ${escapeHtml(result.route)}`
  if (state.mode === 'split') {
    return `<div class="cols">
      <div class="col"><h3>BASE<small>${escapeHtml(result.baseUrl)}</small></h3><img src="${result.baseSrc}" alt="${alt('Base')}" /></div>
      <div class="col"><h3>HEAD<small>${escapeHtml(result.headUrl)}</small></h3><img src="${result.headSrc}" alt="${alt('Head')}" /></div>
      <div class="col"><h3>DIFF<small>changed pixels in red</small></h3><img src="${result.diffSrc}" alt="Pixel difference for ${escapeHtml(result.route)}" /></div>
    </div>`
  }
  const stackStyle = `max-width: ${result.width}px; aspect-ratio: ${result.width} / ${result.height}`
  const widthOf = size => `width: ${(size.width / result.width) * 100}%`
  if (state.mode === 'highlight') {
    return `<div class="stack" style="${stackStyle}"><img class="layer" src="${result.diffSrc}" alt="Pixel difference for ${escapeHtml(result.route)}" style="width: 100%" /></div>`
  }
  const topStyle = state.mode === 'slider'
    ? `clip-path: inset(0 0 0 ${state.range}%)`
    : state.mode === 'fade' ? `opacity: ${state.range / 100}` : ''
  return `<div class="stack${state.mode === 'subtract' ? ' difference' : ''}" style="${stackStyle}">
    <img class="layer" src="${result.baseSrc}" alt="${alt('Base')}" style="${widthOf(result.baseSize)}" />
    <img class="layer top" src="${result.headSrc}" alt="${alt('Head')}" style="${widthOf(result.headSize)}; ${topStyle}" />
    ${state.mode === 'slider' ? `<div class="handle" style="left: ${state.range}%"></div>` : ''}
  </div>`
}

const renderViewer = () => {
  const result = state.results.find(r => r.route === state.selected && r.diffSrc)
  ui.viewer.hidden = !result
  if (!result) { ui.viewer.innerHTML = ''; return }
  ui.viewer.innerHTML = `<div class="toolbar">
      <code>${escapeHtml(result.route)}</code>
      ${modeButtons()}
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

const captureSide = async (comparison, url, options) =>
  comparison.direct ? loadImage(url, options) : (await enginePromise).capture(url, options)

const runComparison = async (result, { width, signal }) => {
  const options = { width, signal, apiKey: fields.apiKey.value.trim() }
  update(result, { status: 'Capturing both screenshots…' })
  const [baseBlob, headBlob] = await Promise.all([
    captureSide(result, result.baseUrl, options),
    captureSide(result, result.headUrl, options)
  ])
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

const run = async query => {
  state.run?.abort()
  const controller = new AbortController()
  state.run = controller
  revokeResults()
  state.results = planComparisons(query).map(comparison => ({ ...comparison, status: 'Queued' }))
  const view = readViewParams()
  state.selected = state.results.some(r => r.route === view.selected) ? view.selected : null
  if (!state.selected) syncViewParams()
  state.mode = view.mode
  ui.submit.setAttribute('aria-busy', 'true')
  render()
  for (const result of state.results) {
    if (controller.signal.aborted) return
    try {
      await runComparison(result, { width: query.width, signal: controller.signal })
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
  run(query)
})

ui.rows.addEventListener('click', event => {
  const button = event.target.closest('[data-select]')
  if (!button) return
  selectRoute(button.dataset.select)
  ui.viewer.scrollIntoView({ block: 'start' })
})

ui.viewer.addEventListener('click', event => {
  const button = event.target.closest('[data-mode]')
  if (!button) return
  state.mode = button.dataset.mode
  syncViewParams()
  renderViewer()
  ui.viewer.querySelector(`[data-mode="${state.mode}"]`)?.focus()
})

ui.viewer.addEventListener('input', event => {
  if (event.target.id !== 'range') return
  state.range = Number(event.target.value)
  const top = ui.viewer.querySelector('img.top')
  if (state.mode === 'slider') {
    top.style.clipPath = `inset(0 0 0 ${state.range}%)`
    ui.viewer.querySelector('.handle').style.left = `${state.range}%`
  } else {
    top.style.opacity = String(state.range / 100)
  }
})

const startFromUrl = () => {
  const query = readQuery(location.search)
  fillForm(query)
  if (isHttpUrl(query.base) && isHttpUrl(query.head)) run(query)
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
