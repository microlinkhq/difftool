import { Reveal } from "./reveal"
import { columnClass, verdictClass, verdictLabel } from "@/lib/comment-table"
import { EXAMPLE_COMPARE_URL, EXAMPLE_IMAGES } from "@/lib/site"

const STAGES = [
  {
    title: "Waits for your preview",
    body: "With head set to vercel, the action polls the deployment for the PR's head commit and starts the moment it is ready. Any other host works with a plain URL.",
  },
  {
    title: "Screenshots both deploys",
    body: "Microlink renders every route you list as a full-page screenshot, once on production and once on the preview, with the same browser and viewport.",
  },
  {
    title: "Compares them pixel by pixel",
    body: "Each pair is diffed and scored against your threshold: under it passes, a little over warns, far over fails the check.",
  },
  {
    title: "Comments once, keeps it fresh",
    body: "One sticky comment on the pull request, rewritten on every push. When the PR closes, its screenshots are deleted from your bucket.",
  },
]

const COLUMNS = [
  { heading: "Route", wide: false },
  { heading: "Changes", wide: false },
  { heading: "Production", wide: true },
  { heading: "Preview", wide: true },
  { heading: "Difference", wide: true },
  { heading: "Compare", wide: false },
  { heading: "Verdict", wide: false },
]

const ROUTES = [
  { route: "/kikobeats", changes: "3.20%", verdict: "fail" },
  { route: "/", changes: "0.01%", verdict: "pass" },
] as const

function PullRequestComment() {
  return (
    <figure data-ui className="overflow-hidden rounded-2xl bg-card text-card-foreground">
      <div className="flex items-center gap-3 bg-muted px-5 py-3.5 text-[14px]">
        <img src="https://cdn.microlink.io/logo/logo.svg" alt="" width={24} height={24} className="h-6 w-6 rounded-full bg-background" />
        <span>
          <span className="font-semibold">github-actions</span> <span className="text-muted-foreground">commented on #106</span>
        </span>
      </div>
      <div className="px-5 pb-5 pt-4">
        <p className="text-[18px] font-semibold tracking-[-0.01em]">@microlink/difftool visual comparison</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          base <span className="text-link">unavatar.io</span> · head{" "}
          <span className="text-link">unavatar-www-git-fix-microlink.vercel.app</span>
        </p>
        <p className="mt-4 flex items-center gap-2 text-[16px] font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden />
          1/2 routes failed
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full sm:min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="text-muted-foreground">
                {COLUMNS.map(({ heading, wide }) => (
                  <th key={heading} scope="col" className={`border-b border-border py-2 pr-3 font-medium ${columnClass(wide)}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUTES.map(({ route, changes, verdict }) => (
                <tr key={route}>
                  <td className="border-b border-border py-2.5 pr-3">
                    <code className="font-mono text-[14px]">{route}</code>
                  </td>
                  <td className="border-b border-border py-2.5 pr-3 tabular-nums">{changes}</td>
                  <td className="hidden border-b border-border py-2.5 pr-3 sm:table-cell">
                    <a className="text-link hover:text-link-hover hover:underline" href={EXAMPLE_IMAGES.base}>open</a>
                  </td>
                  <td className="hidden border-b border-border py-2.5 pr-3 sm:table-cell">
                    <a className="text-link hover:text-link-hover hover:underline" href={EXAMPLE_IMAGES.head}>open</a>
                  </td>
                  <td className="hidden border-b border-border py-2.5 pr-3 sm:table-cell">
                    <a className="text-link hover:text-link-hover hover:underline" href="/examples/diff.webp">open</a>
                  </td>
                  <td className="border-b border-border py-2.5 pr-3">
                    <a className="text-link hover:text-link-hover hover:underline" href={EXAMPLE_COMPARE_URL}>compare</a>
                  </td>
                  <td className="border-b border-border py-2.5">
                    <span className={`font-medium ${verdictClass(verdict)}`}>{verdictLabel(verdict)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <figcaption className="sr-only">The sticky comment difftool posts on a pull request</figcaption>
    </figure>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="px-page">
      <div className="rounded-[32px] bg-ink-panel px-6 py-16 text-ink-panel-foreground sm:px-10 md:py-24 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <Reveal className="min-w-0 lg:col-span-5">
            <h2 id="how-title" className="max-w-[14ch] font-serif text-[clamp(2.25rem,4.4vw,4rem)] font-normal leading-[1] tracking-[-0.03em]">
              Every PR gets a <em className="italic">visual</em> diff
            </h2>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.6] text-ink-panel-muted">
              Code review shows you the lines that changed. difftool shows you the page they changed, next to the one
              your users see today.
            </p>
            <ol className="mt-12 flex flex-col gap-8">
              {STAGES.map((stage) => (
                <li key={stage.title}>
                  <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{stage.title}</h3>
                  <p className="mt-2 max-w-[46ch] text-[16px] leading-[1.6] text-ink-panel-muted">{stage.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal className="flex min-w-0 flex-col gap-6 lg:col-span-7 lg:pt-2">
            <PullRequestComment />
            <figure>
              <img
                src="/examples/highlight.webp"
                alt="The unavatar.io headline in highlight mode: the yellow marker behind “avatars API” moved by a few pixels, and every pixel it moved is painted pink."
                width={1440}
                height={440}
                loading="lazy"
                className="w-full rounded-2xl bg-card"
              />
              <figcaption className="mt-3 max-w-[60ch] text-[16px] leading-[1.6] text-ink-panel-muted">
                The 0.01% on that route, up close: the marker behind the headline shifted, and every pixel it moved is
                pink. The comment also links the{" "}
                <a href="/examples/review.webp" className="text-ink-panel-foreground underline underline-offset-4">
                  full review image
                </a>
                .
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
