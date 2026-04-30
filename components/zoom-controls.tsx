"use client"

import { Minus, Plus, Maximize2 } from "lucide-react"

interface ZoomControlsProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  minZoom?: number
  maxZoom?: number
}

export function ZoomControls({ 
  zoom, 
  onZoomChange, 
  minZoom = 10, 
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
    onZoomChange(100)
  }

  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1.5">
      <button
        onClick={handleZoomOut}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>
      
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        value={zoom}
        onChange={(e) => onZoomChange(Number(e.target.value))}
        className="w-32 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
      />
      
      <button
        onClick={handleReset}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Reset zoom to 100%"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      
      <button
        onClick={handleZoomIn}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>
      
      <span className="text-sm font-medium text-foreground min-w-[4rem] text-right">
        {zoom}%
      </span>
    </div>
  )
}
