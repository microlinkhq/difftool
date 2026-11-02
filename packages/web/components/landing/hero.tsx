import Image from "next/image"
import { TEXT_LINK_CLASS } from "@/lib/link"
import { BrushStroke } from "./brush-stroke"
import { ArrowRight, Camera } from "lucide-react"
import landscape from "@/public/hero/landscape.webp"
import { CTA_CLASS } from "@/lib/cta"
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
          className="max-w-[12ch] text-balance font-serif text-[clamp(2.75rem,5.4vw,4.25rem)] font-normal leading-[1.15] tracking-[-0.03em]"
        >
          See <em className="italic">every</em> pixel your PR changed
        </h1>
        <BrushStroke className="mt-6" />
        <p className="mt-5 max-w-[40ch] text-pretty text-[17px] leading-[1.5] text-muted-foreground">
          A GitHub Action that posts pixel diffs of production against your preview deploy on every pull request.
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
            className="w-full max-w-[920px] rounded-[24px] bg-card p-5 text-left shadow-[var(--shadow-lifted)] sm:p-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">{slots}</div>
            <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-foreground/10 pt-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2.5 text-[15px]">
                <Camera className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  No screenshots at hand?{" "}
                  <a
                    href={EXAMPLE_COMPARE_URL}
                    onClick={(event) => followExample(event, onTryExample)}
                    className={TEXT_LINK_CLASS}
                  >
                    Use a real pair.
                  </a>
                </span>
              </p>
              <a
                href={EXAMPLE_COMPARE_URL}
                onClick={(event) => followExample(event, onTryExample)}
                className={CTA_CLASS}
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
