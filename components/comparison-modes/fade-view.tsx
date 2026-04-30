"use client"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

interface FadeViewProps {
  image1: string
  image2: string
  fadeValue: number
  onFadeChange: (value: number) => void
}

export function FadeView({ image1, image2, fadeValue, onFadeChange }: FadeViewProps) {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative max-w-full max-h-full">
          <img
            src={image1}
            alt="Base image"
            className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-lg"
          />
          <img
            src={image2}
            alt="Compare image"
            className="absolute inset-0 max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity"
            style={{ opacity: fadeValue / 100 }}
          />
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
            className="ml-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
