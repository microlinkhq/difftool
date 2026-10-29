"use client"

import { useState } from "react"
import type { ComparisonMode } from "@/lib/modes"
import { SplitView } from "./comparison-modes/split-view"
import { FadeView } from "./comparison-modes/fade-view"
import { SliderView } from "./comparison-modes/slider-view"
import { HighlightView } from "./comparison-modes/highlight-view"
import { SubtractView } from "./comparison-modes/subtract-view"
import { DEFAULT_ZOOM, ZoomControls } from "./zoom-controls"

interface ComparisonViewProps {
  image1: string
  image2: string
  mode: ComparisonMode
  initialZoom?: number
}

export function ComparisonView({ image1, image2, mode, initialZoom = DEFAULT_ZOOM }: ComparisonViewProps) {
  const [fadeValue, setFadeValue] = useState(50)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [zoom, setZoom] = useState(initialZoom)

  return (
    <div className="h-full w-full bg-muted/30 relative flex flex-col">
      <div className="flex-1 overflow-auto">
        {mode === "split" && (
          <SplitView image1={image1} image2={image2} zoom={zoom} />
        )}
        {mode === "fade" && (
          <FadeView 
            image1={image1} 
            image2={image2} 
            fadeValue={fadeValue}
            onFadeChange={setFadeValue}
            zoom={zoom}
          />
        )}
        {mode === "slider" && (
          <SliderView 
            image1={image1} 
            image2={image2}
            position={sliderPosition}
            onPositionChange={setSliderPosition}
            zoom={zoom}
          />
        )}
        {mode === "highlight" && (
          <HighlightView image1={image1} image2={image2} zoom={zoom} />
        )}
        {mode === "subtract" && (
          <SubtractView image1={image1} image2={image2} zoom={zoom} />
        )}
      </div>
      
      <div className="absolute bottom-4 right-4">
        <ZoomControls zoom={zoom} onZoomChange={setZoom} />
      </div>
    </div>
  )
}
