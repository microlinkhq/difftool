"use client"

import { useCallback, useRef, useState } from "react"

interface SliderViewProps {
  image1: string
  image2: string
  position: number
  onPositionChange: (position: number) => void
}

export function SliderView({ image1, image2, position, onPositionChange }: SliderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    onPositionChange(percentage)
  }, [onPositionChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    handleMove(e.clientX)
  }, [handleMove])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    handleMove(e.clientX)
  }, [isDragging, handleMove])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    handleMove(e.touches[0].clientX)
  }, [isDragging, handleMove])

  return (
    <div 
      ref={containerRef}
      className="h-full w-full flex items-center justify-center p-4 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      <div className="relative max-w-full max-h-full overflow-hidden rounded-lg shadow-lg">
        {/* Base layer - Image 2 (right side, full) */}
        <img
          src={image2}
          alt="Compare image"
          className="block max-w-full max-h-[calc(100vh-150px)] object-contain"
          draggable={false}
        />
        
        {/* Overlay layer - Image 1 (left side, clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={image1}
            alt="Base image"
            className="block max-w-full max-h-[calc(100vh-150px)] object-contain"
            draggable={false}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
              <path d="M18 8L22 12L18 16" />
              <path d="M6 8L2 12L6 16" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
