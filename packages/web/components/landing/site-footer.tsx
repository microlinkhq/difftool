import { DOCS_URL, GITHUB_URL, HERO_PAINTING_URL, MICROLINK_URL } from "@/lib/site"

const LINKS = [
  { href: GITHUB_URL, label: "GitHub" },
  { href: DOCS_URL, label: "Documentation" },
  { href: `${GITHUB_URL}/blob/master/LICENSE.md`, label: "MIT license" },
]

export function SiteFooter() {
  return (
    <footer className="px-page pb-8 pt-8">
      <div className="overflow-hidden rounded-[32px] bg-ink-panel px-6 pb-8 pt-12 text-ink-panel-foreground sm:px-10 lg:px-16">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-[40ch] text-[18px] leading-[1.6] text-ink-panel-muted">
            Visual regression diffs for every pull request, built on the{" "}
            <a href={MICROLINK_URL} className="text-ink-panel-foreground underline-offset-4 hover:underline">
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
        <p
          aria-hidden
          className="mt-16 select-none text-[26vw] lg:text-[28.5vw] font-semibold leading-[0.8] tracking-[-0.06em]"
        >
          difftool
        </p>
        <div className="mt-8 flex flex-col gap-2 text-[14px] text-ink-panel-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Microlink</p>
          <p>
            Hero painting:{" "}
            <a href={HERO_PAINTING_URL} className="underline-offset-4 hover:text-ink-panel-foreground hover:underline">
              Landscape
            </a>{" "}
            by Auguste Renoir, 1889, The Met, public domain.
          </p>
        </div>
      </div>
    </footer>
  )
}
