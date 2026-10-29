"use client"

import { Minus, Plus, Maximize2 } from "lucide-react"
import { DEFAULT_ZOOM, MIN_ZOOM } from "@/lib/zoom"

interface ZoomControlsProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  minZoom?: number
  maxZoom?: number
}

export function ZoomControls({ 
  zoom, 
  onZoomChange, 
  minZoom = MIN_ZOOM, 
  maxZoom = 500 
}: ZoomControlsProps) {
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 25, maxZoom)
    onZoomChange(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 25, minZoom)
    onZoomChange(newZoom)
  }

  const handleReset = () => {
    onZoomChange(DEFAULT_ZOOM)
  }

  return (
    <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
      <button
        onClick={handleZoomOut}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>
      
      <input
        type="range"
        aria-label="Zoom level"
        min={minZoom}
        max={maxZoom}
        value={zoom}
        onChange={(e) => onZoomChange(Number(e.target.value))}
        className="w-24 h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer"
      />
      
      <button
        onClick={handleReset}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Reset zoom to ${DEFAULT_ZOOM}%`}
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      
      <button
        onClick={handleZoomIn}
        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>
      
      <span className="text-sm tabular-nums text-foreground min-w-[3.5rem] text-right pr-1">
        {zoom}%
      </span>
    </div>
  )
}
