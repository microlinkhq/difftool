"use client"

import { useEffect, useRef, useState } from "react"

interface SubtractViewProps {
  image1: string
  image2: string
}

export function SubtractView({ image1, image2 }: SubtractViewProps) {
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

      // Draw image1 first
      ctx.drawImage(img1, 0, 0, width, height)
      const data1 = ctx.getImageData(0, 0, width, height)

      // Draw image2
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img2, 0, 0, width, height)
      const data2 = ctx.getImageData(0, 0, width, height)

      // Create difference image
      const outputData = ctx.createImageData(width, height)

      for (let i = 0; i < data1.data.length; i += 4) {
        // Calculate absolute difference for each channel
        const rDiff = Math.abs(data1.data[i] - data2.data[i])
        const gDiff = Math.abs(data1.data[i + 1] - data2.data[i + 1])
        const bDiff = Math.abs(data1.data[i + 2] - data2.data[i + 2])

        // Amplify the differences for visibility
        const amplify = 3
        outputData.data[i] = Math.min(255, rDiff * amplify)
        outputData.data[i + 1] = Math.min(255, gDiff * amplify)
        outputData.data[i + 2] = Math.min(255, bDiff * amplify)
        outputData.data[i + 3] = 255 // Full opacity
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
    <div className="h-full w-full flex items-center justify-center p-4 bg-neutral-900">
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
