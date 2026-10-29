"use client"

import { useCallback, useRef, useState } from "react"
import { ImageUp, Loader2, X } from "lucide-react"
import { canDisplay, fetchDisplayableImage, fileNameFromUrl, readDataUrl } from "@/lib/load-image"

interface ImageUploaderProps {
  label: string
  hint: string
  image: string | null
  onImageChange: (dataUrl: string | null, name?: string, originalUrl?: string) => void
  isLoading?: boolean
  loadError?: string | null
}

export function ImageUploader({ label, hint, image, onImageChange, isLoading, loadError }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestRequest = useRef(0)
  const [dismissedLoadError, setDismissedLoadError] = useState<string | null>(null)
  const visibleError = error ?? (loadError === dismissedLoadError ? null : loadError)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const readFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    const request = ++latestRequest.current
    setIsLoadingUrl(false)
    const dataUrl = await readDataUrl(file).catch(() => null)
    const displayable = dataUrl !== null && (await canDisplay(dataUrl))
    if (request !== latestRequest.current) return
    if (!displayable) {
      setError(`${file.name} is not an image this browser can display.`)
      return
    }
    setError(null)
    onImageChange(dataUrl, file.name)
  }, [onImageChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    readFile(e.dataTransfer.files[0])
  }, [readFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e.target.files?.[0])
  }, [readFile])

  const handleUrlSubmit = useCallback(async () => {
    if (!urlValue.trim()) return
    const request = ++latestRequest.current
    setIsLoadingUrl(true)
    try {
      const dataUrl = await fetchDisplayableImage(urlValue)
      if (request !== latestRequest.current) return
      setError(null)
      onImageChange(dataUrl, fileNameFromUrl(urlValue), urlValue)
      setUrlValue("")
    } catch {
      if (request === latestRequest.current) setError("Could not load an image from that URL.")
    } finally {
      if (request === latestRequest.current) setIsLoadingUrl(false)
    }
  }, [urlValue, onImageChange])

  const slot = "relative h-full min-h-[132px] rounded-2xl md:min-h-[208px]"

  if (isLoading) {
    return (
      <div className={`${slot} bg-muted flex items-center justify-center`}>
        <div role="status" className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
          <span className="text-sm">Loading {label.toLowerCase()}…</span>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className={`${slot} bg-muted overflow-hidden flex items-center justify-center p-3`}>
        <img src={image} alt={label} className="max-w-full max-h-full object-contain rounded-lg" />
        <span className="absolute left-3 top-3 rounded-full bg-background px-2.5 py-1 text-[14px] font-medium">{label}</span>
        <button
          type="button"
          onClick={() => onImageChange(null)}
          aria-label={`Remove ${label.toLowerCase()} image`}
          className="press absolute top-3 right-3 rounded-full bg-background p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${slot} group flex flex-col justify-between gap-4 p-4 md:gap-6 md:p-5 transition-colors ${
        isDragging ? "bg-changed/10 ring-2 ring-changed" : "bg-muted hover:bg-[#e9e8e5]"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        aria-label={`Choose the ${label.toLowerCase()} image`}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="pointer-events-none flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-semibold tracking-[-0.01em]">{label}</p>
          <p className="mt-1 hidden text-[16px] text-muted-foreground sm:block">{hint}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-foreground transition-transform group-hover:-translate-y-0.5">
          <ImageUp className="w-[18px] h-[18px]" aria-hidden />
        </span>
      </div>

      <div className="relative z-10">
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="url"
            inputMode="url"
            placeholder="or paste a URL"
            aria-label={`${label} image URL`}
            value={urlValue}
            onChange={(e) => { setUrlValue(e.target.value); setError(null); setDismissedLoadError(loadError ?? null) }}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="min-w-0 flex-1 h-10 rounded-full bg-background px-4 text-[16px] placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={isLoadingUrl || !urlValue.trim()}
            className="press h-10 rounded-full bg-foreground px-4 text-[16px] font-medium text-background hover:bg-foreground/85 disabled:bg-background disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : "Load"}
          </button>
        </div>
        <p role="alert" className="mt-2 min-h-5 text-[14px] text-destructive">{visibleError}</p>
      </div>
    </div>
  )
}
