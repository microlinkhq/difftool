"use client"

import { useEffect, useState, useCallback } from "react"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { ImageUploader } from "@/components/image-uploader"
import { ComparisonView } from "@/components/comparison-view"
import { ModeSelector } from "@/components/mode-selector"
import { Loader2, ArrowLeftRight } from "lucide-react"

export type ComparisonMode = "split" | "fade" | "slider" | "highlight" | "subtract"

const comparisonModes = ["split", "fade", "slider", "highlight", "subtract"] as const

export function ImageCompareClient() {
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(comparisonModes).withDefault("highlight")
  )
  const [image1Url, setImage1Url] = useQueryState("base", { defaultValue: "" })
  const [image2Url, setImage2Url] = useQueryState("head", { defaultValue: "" })

  const [image1Data, setImage1Data] = useState<string | null>(null)
  const [image2Data, setImage2Data] = useState<string | null>(null)
  const [image1Name, setImage1Name] = useState<string>("Base")
  const [image2Name, setImage2Name] = useState<string>("Head")
  const [isLoadingImage1, setIsLoadingImage1] = useState(false)
  const [isLoadingImage2, setIsLoadingImage2] = useState(false)

  const loadImageFromUrl = useCallback(async (
    url: string,
    setData: (data: string | null) => void,
    setName: (name: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!url) {
      setData(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch image")

      const blob = await response.blob()
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read image"))
        reader.readAsDataURL(blob)
      })

      const urlPath = url.split("?")[0]
      const fileName = urlPath.split("/").pop() || "URL Image"

      setData(dataUrl)
      setName(fileName)
    } catch (error) {
      console.error("Failed to load image:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (image1Url && !image1Data) {
      loadImageFromUrl(image1Url, setImage1Data, setImage1Name, setIsLoadingImage1)
    }
  }, [image1Url, image1Data, loadImageFromUrl])

  useEffect(() => {
    if (image2Url && !image2Data) {
      loadImageFromUrl(image2Url, setImage2Data, setImage2Name, setIsLoadingImage2)
    }
  }, [image2Url, image2Data, loadImageFromUrl])

  const handleImage1Change = useCallback((dataUrl: string | null, name?: string, originalUrl?: string) => {
    setImage1Data(dataUrl)
    if (name) setImage1Name(name)
    if (originalUrl) {
      setImage1Url(originalUrl)
    } else if (!dataUrl) {
      setImage1Url("")
    }
  }, [setImage1Url])

  const handleImage2Change = useCallback((dataUrl: string | null, name?: string, originalUrl?: string) => {
    setImage2Data(dataUrl)
    if (name) setImage2Name(name)
    if (originalUrl) {
      setImage2Url(originalUrl)
    } else if (!dataUrl) {
      setImage2Url("")
    }
  }, [setImage2Url])

  const handleReset = useCallback(() => {
    setImage1Data(null)
    setImage2Data(null)
    setImage1Name("Base")
    setImage2Name("Head")
    setImage1Url("")
    setImage2Url("")
  }, [setImage1Url, setImage2Url])

  const bothImagesLoaded = image1Data && image2Data
  const isLoading = isLoadingImage1 || isLoadingImage2

  return (
    <main className="min-h-screen bg-background">
      {bothImagesLoaded ? (
        <div className="flex flex-col h-screen">
          <header className="border-b border-border bg-background">
            <div className="flex items-center justify-between px-4 h-12">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-foreground truncate max-w-[200px]">{image1Name}</span>
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[200px]">{image2Name}</span>
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
              image1={image1Data}
              image2={image2Data}
              mode={mode}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-background">
            <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
              <h1 className="text-sm font-semibold text-foreground">Image Diff Compare</h1>
            </div>
          </header>
          
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
              {isLoading && (
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading images from URL...
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <ImageUploader
                  label="Base Image"
                  image={image1Data}
                  onImageChange={handleImage1Change}
                  isLoading={isLoadingImage1}
                />
                <ImageUploader
                  label="Compare Image"
                  image={image2Data}
                  onImageChange={handleImage2Change}
                  isLoading={isLoadingImage2}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Compare two images using different visualization modes
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
