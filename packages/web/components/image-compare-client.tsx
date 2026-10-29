"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { ImageUploader } from "@/components/image-uploader"
import { ComparisonView } from "@/components/comparison-view"
import { ModeSelector } from "@/components/mode-selector"
import { TopBar } from "@/components/top-bar"
import { Landing } from "@/components/landing/landing"
import { ArrowLeftRight } from "lucide-react"
import { fetchDisplayableImage, fileNameFromUrl } from "@/lib/load-image"
import { COMPARISON_MODES } from "@/lib/modes"
import { EXAMPLE_IMAGES } from "@/lib/site"

export function ImageCompareClient() {
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(COMPARISON_MODES).withDefault("highlight")
  )
  const [image1Url, setImage1Url] = useQueryState("base", { defaultValue: "" })
  const [image2Url, setImage2Url] = useQueryState("head", { defaultValue: "" })

  const [image1Data, setImage1Data] = useState<string | null>(null)
  const [image2Data, setImage2Data] = useState<string | null>(null)
  const [image1Name, setImage1Name] = useState<string>("Base")
  const [image2Name, setImage2Name] = useState<string>("Head")
  const [isLoadingImage1, setIsLoadingImage1] = useState(false)
  const [isLoadingImage2, setIsLoadingImage2] = useState(false)
  const [image1Error, setImage1Error] = useState<string | null>(null)
  const [image2Error, setImage2Error] = useState<string | null>(null)

  const latestLoad = useRef({ base: 0, head: 0 })

  const loadImageFromUrl = useCallback(async (
    slot: "base" | "head",
    url: string,
    setData: (data: string | null) => void,
    setName: (name: string) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void
  ) => {
    const request = ++latestLoad.current[slot]
    const isLatest = () => request === latestLoad.current[slot]
    if (!url) {
      setData(null)
      return
    }

    setLoading(true)
    try {
      const dataUrl = await fetchDisplayableImage(url)
      if (!isLatest()) return
      setData(dataUrl)
      setName(fileNameFromUrl(url))
      setError(null)
    } catch (error) {
      if (!isLatest()) return
      console.error("Failed to load image:", error)
      setData(null)
      setError(`Could not load ${fileNameFromUrl(url)} as an image.`)
    } finally {
      if (isLatest()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (image1Url && !image1Data) {
      loadImageFromUrl("base", image1Url, setImage1Data, setImage1Name, setIsLoadingImage1, setImage1Error)
    } else {
      latestLoad.current.base++
      setIsLoadingImage1(false)
    }
  }, [image1Url, image1Data, loadImageFromUrl])

  useEffect(() => {
    if (image2Url && !image2Data) {
      loadImageFromUrl("head", image2Url, setImage2Data, setImage2Name, setIsLoadingImage2, setImage2Error)
    } else {
      latestLoad.current.head++
      setIsLoadingImage2(false)
    }
  }, [image2Url, image2Data, loadImageFromUrl])

  const handleImage1Change = useCallback((dataUrl: string | null, name?: string, originalUrl?: string) => {
    latestLoad.current.base++
    setIsLoadingImage1(false)
    setImage1Error(null)
    setImage1Data(dataUrl)
    if (name) setImage1Name(name)
    if (originalUrl) {
      setImage1Url(originalUrl)
    } else if (!dataUrl) {
      setImage1Url("")
    }
  }, [setImage1Url])

  const handleImage2Change = useCallback((dataUrl: string | null, name?: string, originalUrl?: string) => {
    latestLoad.current.head++
    setIsLoadingImage2(false)
    setImage2Error(null)
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
    setImage1Error(null)
    setImage2Error(null)
  }, [setImage1Url, setImage2Url])

  const handleTryExample = useCallback(() => {
    setImage1Url(EXAMPLE_IMAGES.base)
    setImage2Url(EXAMPLE_IMAGES.head)
  }, [setImage1Url, setImage2Url])

  if (image1Data && image2Data) {
    return (
      <main className="flex h-dvh flex-col bg-background">
        <TopBar sticky={false}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 items-center gap-2 text-sm sm:flex">
              <span className="truncate font-medium max-w-[200px]">{image1Name}</span>
              <ArrowLeftRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-label="compared with" />
              <span className="truncate font-medium max-w-[200px]">{image2Name}</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="press h-9 shrink-0 rounded-full px-4 text-[16px] font-medium text-primary hover:bg-muted"
            >
              New comparison
            </button>
          </div>
        </TopBar>
        <ModeSelector mode={mode} onModeChange={setMode} className="justify-start px-page pb-3 sm:justify-center" />
        <div className="flex-1 overflow-hidden">
          <ComparisonView image1={image1Data} image2={image2Data} mode={mode} />
        </div>
      </main>
    )
  }

  return (
    <Landing
      onTryExample={handleTryExample}
      slots={
        <>
          <ImageUploader
            label="Production"
            hint="The page as it is today"
            image={image1Data}
            onImageChange={handleImage1Change}
            isLoading={isLoadingImage1}
            loadError={image1Error}
          />
          <ImageUploader
            label="Preview"
            hint="The page as this change ships it"
            image={image2Data}
            onImageChange={handleImage2Change}
            isLoading={isLoadingImage2}
            loadError={image2Error}
          />
        </>
      }
    />
  )
}
