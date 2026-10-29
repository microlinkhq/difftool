import { MicrolinkLink } from "./microlink-link"
import { DOCS_URL, GITHUB_URL, HERO_PAINTING_URL, MICROLINK_URL } from "@/lib/site"

const LINKS = [
  { href: GITHUB_URL, label: "GitHub" },
  { href: DOCS_URL, label: "Documentation" },
  { href: `${GITHUB_URL}/blob/master/LICENSE.md`, label: "MIT license" },
]

const linkClass = "underline-offset-4 hover:text-foreground hover:underline"

export function SiteFooter() {
  return (
    <footer className="px-page pb-8 pt-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-[40ch] text-[18px] leading-[1.6] text-muted-foreground">
          Visual regression diffs for every pull request, built on the{" "}
          <a href={MICROLINK_URL} className="text-foreground underline-offset-4 hover:underline">
            Microlink
          </a>{" "}
          screenshot API.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[16px]">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="underline-offset-4 hover:underline">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div aria-hidden className="mt-16 overflow-hidden border-b border-border">
        <p className="painted-text -mb-[0.2em] select-none text-center font-serif text-[clamp(4rem,30vw,36rem)] leading-[0.9] tracking-[-0.03em]">
          difftool
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-2 text-[14px] text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} <MicrolinkLink />
        </p>
        <p>
          Painting:{" "}
          <a href={HERO_PAINTING_URL} className={linkClass}>
            Landscape
          </a>{" "}
          by Auguste Renoir, 1889, The Met, public domain.
        </p>
      </div>
    </footer>
  )
}
