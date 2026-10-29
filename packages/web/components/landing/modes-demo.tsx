"use client"

import { useEffect, useRef, useState } from "react"
import { ComparisonView } from "@/components/comparison-view"
import { ModeSelector } from "@/components/mode-selector"
import { MODE_DETAILS, type ComparisonMode } from "@/lib/modes"
import { observeWhenVisible, showWhenNear } from "@/lib/reveal"
import { EXAMPLE_IMAGES } from "@/lib/site"
import { frameWidth, zoomForFrame } from "@/lib/zoom"
import { Reveal } from "./reveal"

export function ModesDemo() {
  const [mode, setMode] = useState<ComparisonMode>("slider")
  const frameRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(
    () =>
      observeWhenVisible(frameRef.current, globalThis.IntersectionObserver, { rootMargin: "400px 0px" }, {
        onVisible: () => setNear(true),
      }),
    []
  )

  return (
    <section id="modes" aria-labelledby="modes-title" className="px-page">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2
            id="modes-title"
            className="max-w-[12ch] text-[clamp(2.25rem,4.4vw,4rem)] font-semibold leading-[1] tracking-[-0.04em] lg:col-span-6"
          >
            Five ways to read a change
          </h2>
          <p className="max-w-[46ch] text-[18px] leading-[1.6] text-muted-foreground lg:col-span-5 lg:col-start-8">
            Every compare link in the comment opens here. This is the pull request from above: the unavatar.io
            headline moved by a few pixels. Switch modes and find it.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <div data-ui className="overflow-hidden rounded-[28px] bg-card shadow-[var(--shadow-ring)]">
            <div className="flex flex-col gap-3 px-3 pb-3 pt-3 md:flex-row md:items-center md:justify-between md:px-4">
              <ModeSelector mode={mode} onModeChange={setMode} />
              <p aria-live="polite" className="px-2 text-[16px] text-muted-foreground md:text-right">
                {MODE_DETAILS[mode].summary}
              </p>
            </div>
            <div ref={frameRef} className="h-[300px] bg-muted sm:h-[440px] md:h-[600px]">
              {showWhenNear(
                near,
                <ComparisonView
                  image1={EXAMPLE_IMAGES.base}
                  image2={EXAMPLE_IMAGES.head}
                  mode={mode}
                  initialZoom={zoomForFrame(frameWidth(frameRef.current))}
                />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
