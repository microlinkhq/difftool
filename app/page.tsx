"use client"

import { useState } from "react"
import { ImageUploader } from "@/components/image-uploader"
import { ComparisonView } from "@/components/comparison-view"
import { ModeSelector } from "@/components/mode-selector"

export type ComparisonMode = "split" | "fade" | "slider" | "highlight" | "subtract"

export default function Home() {
  const [image1, setImage1] = useState<string | null>(null)
  const [image2, setImage2] = useState<string | null>(null)
  const [mode, setMode] = useState<ComparisonMode>("split")
  const [image1Name, setImage1Name] = useState<string>("Image 1")
  const [image2Name, setImage2Name] = useState<string>("Image 2")

  const handleReset = () => {
    setImage1(null)
    setImage2(null)
    setImage1Name("Image 1")
    setImage2Name("Image 2")
  }

  const bothImagesLoaded = image1 && image2

  return (
    <main className="min-h-screen bg-background">
      {bothImagesLoaded ? (
        <div className="flex flex-col h-screen">
          <header className="border-b border-border bg-card">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{image1Name}</span>
                <span>↔</span>
                <span className="font-medium text-foreground">{image2Name}</span>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            </div>
            <ModeSelector mode={mode} onModeChange={setMode} />
          </header>
          <div className="flex-1 overflow-hidden">
            <ComparisonView
              image1={image1}
              image2={image2}
              mode={mode}
            />
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-foreground mb-2">Image Diff Compare</h1>
            <p className="text-muted-foreground">
              Compare two images using different visualization modes
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <ImageUploader
              label="Base Image"
              image={image1}
              onImageChange={(url, name) => {
                setImage1(url)
                if (name) setImage1Name(name)
              }}
            />
            <ImageUploader
              label="Compare Image"
              image={image2}
              onImageChange={(url, name) => {
                setImage2(url)
                if (name) setImage2Name(name)
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
