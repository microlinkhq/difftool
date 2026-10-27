"use client"

import { useEffect, useRef, useState } from "react"
import { useImagePair } from "@/hooks/use-image-pair"
import { readPixelPair } from "@/lib/pixel-diff"

interface DiffCanvasProps {
  image1: string
  image2: string
  zoom: number
  render: (base: Uint8ClampedArray, head: Uint8ClampedArray) => Uint8ClampedArray
  className?: string
}

const MESSAGES = {
  loading: "Processing differences…",
  error: "One of the images could not be loaded.",
  failed: "These images could not be compared in this browser.",
}

const clearCanvas = (canvas: HTMLCanvasElement) => {
  canvas.width = 0
  canvas.height = 0
}

export function DiffCanvas({ image1, image2, zoom, render, className = "" }: DiffCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pair = useImagePair(image1, image2)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    const canvas = canvasRef.current
    if (!canvas) return
    if (pair.status !== "ready") {
      clearCanvas(canvas)
      return
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      setFailed(true)
      return
    }
    try {
      const { width, height, base, head } = readPixelPair(ctx, pair.base, pair.head)
      ctx.putImageData(new ImageData(render(base, head), width, height), 0, 0)
    } catch {
      clearCanvas(canvas)
      setFailed(true)
    }
  }, [pair, render])

  const message = failed ? MESSAGES.failed : pair.status === "ready" ? null : MESSAGES[pair.status]

  return (
    <div className="relative h-full w-full">
      <div className={`h-full w-full overflow-auto p-4 pb-16 ${className}`}>
        <div className="min-h-full flex items-start justify-center-safe">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-lg"
            style={{ zoom: zoom / 100 }}
          />
        </div>
      </div>
      <div
        role="status"
        className={message ? "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 text-muted-foreground" : "sr-only"}
      >
        {message}
      </div>
    </div>
  )
}
