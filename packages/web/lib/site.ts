export const GITHUB_URL = "https://github.com/microlinkhq/difftool"
export const DOCS_URL = `${GITHUB_URL}#github-action`
export const SITE_URL = "https://difftool.microlink.io"
export const MICROLINK_URL = "https://microlink.io"
export const PRIVACY_URL = `${MICROLINK_URL}/privacy`
export const TERMS_URL = `${MICROLINK_URL}/terms`
export const MICROLINK_DASHBOARD_URL = "https://dashboard.microlink.io"
export const HERO_PAINTING_URL = "https://www.metmuseum.org/art/collection/search/459968"

export const EXAMPLE_IMAGES = {
  base: "/examples/production.webp",
  head: "/examples/preview.webp",
}

export const EXAMPLE_COMPARE_URL = `/?${new URLSearchParams(EXAMPLE_IMAGES)}`

export const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "modes", label: "Modes" },
  { id: "setup", label: "Setup" },
  { id: "faq", label: "FAQ" },
] as const

interface ExampleClick {
  preventDefault: () => void
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  button?: number
}

const opensElsewhere = ({ metaKey, ctrlKey, shiftKey, altKey, button = 0 }: ExampleClick) =>
  Boolean(metaKey || ctrlKey || shiftKey || altKey) || button !== 0

export const followExample = (event: ExampleClick, onTryExample?: () => void) => {
  if (!onTryExample || opensElsewhere(event)) return
  event.preventDefault()
  onTryExample()
}
