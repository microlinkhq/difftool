import { ArrowRight } from "lucide-react"
import { EXAMPLE_COMPARE_URL } from "@/lib/site"

interface HeroProps {
  slots: React.ReactNode
  onTryExample?: () => void
}

const revealIndex = (index: number) => ({ "--reveal-index": index }) as React.CSSProperties

export function Hero({ slots, onTryExample }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="hero-enter relative isolate flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden"
    >
      <div aria-hidden className="hero-glow" />
      <div style={revealIndex(0)} className="mx-auto flex px-page max-w-[1120px] flex-col items-center pb-10 pt-[clamp(2rem,6vh,4.5rem)] text-center md:pb-14">
        <h1
          id="hero-title"
          className="max-w-[16ch] text-balance text-[clamp(2.75rem,7.2vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
        >
          See every pixel your PR <span className="whitespace-nowrap">changed</span>
        </h1>
        <p className="mt-6 max-w-[54ch] text-pretty text-[18px] leading-[1.5] text-muted-foreground">
          difftool screenshots production and your preview deploy, compares them pixel by pixel, and comments on
          the pull request with what moved. Drop two screenshots below to try it.
        </p>
      </div>

      <div
        style={revealIndex(1)}
        className="flex flex-1 items-center justify-center px-page pb-16 pt-4 md:pb-24"
      >
        <div
          data-ui
          className="w-full max-w-[1040px] rounded-[26px] bg-card p-2 text-left shadow-[var(--shadow-lifted)] md:p-2.5"
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2.5">{slots}</div>
          <div className="flex flex-col items-start justify-between gap-3 px-3 pb-2 pt-4 sm:flex-row sm:items-center">
            <p className="text-[16px] text-muted-foreground">Images never leave your browser.</p>
            <a
              href={EXAMPLE_COMPARE_URL}
              onClick={(event) => {
                if (!onTryExample) return
                event.preventDefault()
                onTryExample()
              }}
              className="press group inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[16px] font-medium text-background hover:bg-foreground/85"
            >
              Try a real example
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
