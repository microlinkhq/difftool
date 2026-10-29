import Image from "next/image"
import { ArrowRight } from "lucide-react"
import landscape from "@/public/hero/landscape.webp"
import { EXAMPLE_COMPARE_URL, followExample } from "@/lib/site"

interface HeroProps {
  slots: React.ReactNode
  onTryExample?: () => void
}

const revealIndex = (index: number) => ({ "--reveal-index": index }) as React.CSSProperties

export function Hero({ slots, onTryExample }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="hero-enter relative isolate flex min-h-[calc(100svh-3.5rem)] flex-col items-center overflow-clip pt-[clamp(3rem,9vh,6rem)] text-center"
    >
      <div style={revealIndex(0)} className="flex flex-col items-center px-page">
        <h1
          id="hero-title"
          className="max-w-[12ch] text-balance font-serif text-[clamp(2.75rem,5.4vw,4.25rem)] font-normal leading-[0.95] tracking-[-0.03em]"
        >
          See <em className="italic">every</em> pixel your PR changed
        </h1>
        <p className="mt-6 max-w-[40ch] text-pretty text-[17px] leading-[1.5] text-muted-foreground">
          Pixel diffs of production against your preview deploy, posted on every pull request.
        </p>
      </div>

      <div style={revealIndex(1)} className="relative mt-4 flex w-full flex-1 flex-col items-center">
        <div aria-hidden className="hero-painting pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[1600px]">
          <Image
            src={landscape}
            alt=""
            priority
            sizes="(min-width: 1600px) 1600px, 100vw"
            className="h-full w-full select-none object-cover object-bottom opacity-85"
          />
        </div>
        <div className="flex w-full flex-1 items-center justify-center px-page pb-[clamp(5rem,16vh,10rem)] pt-[clamp(7rem,22vh,14rem)]">
          <div
            data-ui
            className="w-full max-w-[1040px] rounded-[26px] bg-card p-2 text-left shadow-[var(--shadow-lifted)] md:p-2.5"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2.5">{slots}</div>
            <div className="flex flex-col items-start justify-between gap-3 px-3 pb-2 pt-4 sm:flex-row sm:items-center">
              <p className="text-[16px] text-muted-foreground">No screenshots at hand? Use a real pair.</p>
              <a
                href={EXAMPLE_COMPARE_URL}
                onClick={(event) => followExample(event, onTryExample)}
                className="press group inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[16px] font-medium text-background hover:bg-foreground/85"
              >
                Try a real example
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
