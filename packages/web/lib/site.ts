export const GITHUB_URL = "https://github.com/microlinkhq/difftool"
export const DOCS_URL = `${GITHUB_URL}#github-action`
export const MICROLINK_URL = "https://microlink.io"
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

export const followExample = (
  event: { preventDefault: () => void },
  onTryExample?: () => void
) => {
  if (!onTryExample) return
  event.preventDefault()
  onTryExample()
}
