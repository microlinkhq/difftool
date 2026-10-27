"use client"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

interface FadeViewProps {
  image1: string
  image2: string
  fadeValue: number
  onFadeChange: (value: number) => void
  zoom: number
}

export function FadeView({ image1, image2, fadeValue, onFadeChange, zoom }: FadeViewProps) {
  const scale = zoom / 100

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="min-h-full flex items-start justify-center-safe">
          <div className="relative" style={{ zoom: scale }}>
            <img
              src={image1}
              alt="Base image"
              className="block max-w-none rounded-lg shadow-lg"
            />
            <img
              src={image2}
              alt="Compare image"
              className="absolute inset-0 max-w-none rounded-lg shadow-lg transition-opacity"
              style={{ opacity: fadeValue / 100 }}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-8">0%</span>
          <Slider
            value={[fadeValue]}
            onValueChange={([value]) => onFadeChange(value)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">100%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFadeChange(50)}
            aria-label="Reset fade to 50%"
            className="ml-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
