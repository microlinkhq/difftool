"use client"

import { useEffect, useRef, useState } from "react"
import { ComparisonView } from "@/components/comparison-view"
import { ModeSelector } from "@/components/mode-selector"
import { MODE_DETAILS, type ComparisonMode } from "@/lib/modes"
import { EXAMPLE_IMAGES } from "@/lib/site"
import { Reveal } from "./reveal"

const EXAMPLE_WIDTH_PX = 1440
const FRAME_PADDING_PX = 32
const MAX_DEMO_ZOOM = 60

const fitZoom = (frameWidth: number) =>
  Math.min(MAX_DEMO_ZOOM, Math.floor(((frameWidth - FRAME_PADDING_PX) / EXAMPLE_WIDTH_PX) * 100))

function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, near] as const
}

export function ModesDemo() {
  const [mode, setMode] = useState<ComparisonMode>("slider")
  const [frameRef, near] = useNearViewport<HTMLDivElement>()

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
          <div data-ui className="overflow-hidden rounded-[28px] bg-card shadow-[0_0_0_1px_var(--border)]">
            <div className="flex flex-col gap-3 px-3 pb-3 pt-3 md:flex-row md:items-center md:justify-between md:px-4">
              <ModeSelector mode={mode} onModeChange={setMode} />
              <p aria-live="polite" className="px-2 text-[16px] text-muted-foreground md:text-right">
                {MODE_DETAILS[mode].summary}
              </p>
            </div>
            <div ref={frameRef} className="h-[300px] bg-muted sm:h-[440px] md:h-[600px]">
              {near && (
                <ComparisonView
                  image1={EXAMPLE_IMAGES.base}
                  image2={EXAMPLE_IMAGES.head}
                  mode={mode}
                  initialZoom={fitZoom(frameRef.current?.clientWidth ?? EXAMPLE_WIDTH_PX)}
                />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
