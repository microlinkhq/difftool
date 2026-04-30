"use client"

import { useState } from "react"
import type { ComparisonMode } from "@/app/page"
import { SplitView } from "./comparison-modes/split-view"
import { FadeView } from "./comparison-modes/fade-view"
import { SliderView } from "./comparison-modes/slider-view"
import { HighlightView } from "./comparison-modes/highlight-view"
import { SubtractView } from "./comparison-modes/subtract-view"

interface ComparisonViewProps {
  image1: string
  image2: string
  mode: ComparisonMode
}

export function ComparisonView({ image1, image2, mode }: ComparisonViewProps) {
  const [fadeValue, setFadeValue] = useState(50)
  const [sliderPosition, setSliderPosition] = useState(50)

  return (
    <div className="h-full w-full bg-muted/30 relative">
      {mode === "split" && (
        <SplitView image1={image1} image2={image2} />
      )}
      {mode === "fade" && (
        <FadeView 
          image1={image1} 
          image2={image2} 
          fadeValue={fadeValue}
          onFadeChange={setFadeValue}
        />
      )}
      {mode === "slider" && (
        <SliderView 
          image1={image1} 
          image2={image2}
          position={sliderPosition}
          onPositionChange={setSliderPosition}
        />
      )}
      {mode === "highlight" && (
        <HighlightView image1={image1} image2={image2} />
      )}
      {mode === "subtract" && (
        <SubtractView image1={image1} image2={image2} />
      )}
    </div>
  )
}
