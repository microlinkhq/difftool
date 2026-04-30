"use client"

import { useEffect, useRef, useState } from "react"

interface HighlightViewProps {
  image1: string
  image2: string
}

export function HighlightView({ image1, image2 }: HighlightViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    setIsProcessing(true)

    const img1 = new window.Image()
    const img2 = new window.Image()
    img1.crossOrigin = "anonymous"
    img2.crossOrigin = "anonymous"

    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded < 2) return

      // Use the larger dimensions
      const width = Math.max(img1.width, img2.width)
      const height = Math.max(img1.height, img2.height)

      canvas.width = width
      canvas.height = height

      // Draw image1 first (base)
      ctx.drawImage(img1, 0, 0, width, height)
      const data1 = ctx.getImageData(0, 0, width, height)

      // Draw image2
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img2, 0, 0, width, height)
      const data2 = ctx.getImageData(0, 0, width, height)

      // Create output with base image
      ctx.drawImage(img1, 0, 0, width, height)
      const outputData = ctx.getImageData(0, 0, width, height)

      // Highlight differences in magenta/pink
      const threshold = 30
      for (let i = 0; i < data1.data.length; i += 4) {
        const r1 = data1.data[i]
        const g1 = data1.data[i + 1]
        const b1 = data1.data[i + 2]
        const r2 = data2.data[i]
        const g2 = data2.data[i + 1]
        const b2 = data2.data[i + 2]

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)

        if (diff > threshold) {
          // Highlight with magenta overlay
          outputData.data[i] = 255     // R
          outputData.data[i + 1] = 0   // G
          outputData.data[i + 2] = 128 // B
          outputData.data[i + 3] = 180 // A (semi-transparent)
        }
      }

      ctx.putImageData(outputData, 0, 0)
      setIsProcessing(false)
    }

    img1.onload = onLoad
    img2.onload = onLoad
    img1.src = image1
    img2.src = image2
  }, [image1, image2])

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="text-muted-foreground">Processing differences...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-[calc(100vh-150px)] object-contain rounded-lg shadow-lg"
      />
    </div>
  )
}
