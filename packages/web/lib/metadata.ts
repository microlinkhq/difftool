import { GITHUB_URL, MICROLINK_URL, SITE_URL } from "./site.ts"

export const SITE_NAME = "difftool"
export const TITLE = "difftool · Visual diffs on every pull request"
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`
export const DESCRIPTION =
  "Screenshots production and your preview deploy, diffs them pixel by pixel, and comments on the pull request. Or compare two images in your browser."
export const PUBLISHER = "Microlink"
export const TWITTER_HANDLE = "@microlinkhq"
export const THEME_COLOR = "#ffffff"
export const LICENSE_URL = `${GITHUB_URL}/blob/master/LICENSE.md`
export const PUBLISHER_LOGO_URL = "https://cdn.microlink.io/logo/logo.png"

export const MANIFEST_ICONS = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
] as const

export const manifest = () => ({
  name: TITLE,
  short_name: SITE_NAME,
  description: DESCRIPTION,
  start_url: "/",
  scope: "/",
  display: "standalone" as const,
  background_color: THEME_COLOR,
  theme_color: THEME_COLOR,
  icons: [...MANIFEST_ICONS],
})

export const structuredData = () => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  license: LICENSE_URL,
  sameAs: [GITHUB_URL],
  publisher: {
    "@type": "Organization",
    name: PUBLISHER,
    url: MICROLINK_URL,
    logo: PUBLISHER_LOGO_URL,
  },
})

export const jsonLdScript = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c")
