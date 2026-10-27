"use client"

import { useCallback, useRef, useState } from "react"
import { ImageIcon, Loader2, X } from "lucide-react"
import { canDisplay, fetchDisplayableImage, fileNameFromUrl, readDataUrl } from "@/lib/load-image"

interface ImageUploaderProps {
  label: string
  image: string | null
  onImageChange: (dataUrl: string | null, name?: string, originalUrl?: string) => void
  isLoading?: boolean
  loadError?: string | null
}

export function ImageUploader({ label, image, onImageChange, isLoading, loadError }: ImageUploaderProps) {
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

  if (isLoading) {
    return (
      <div className="h-full rounded-lg border border-dashed border-border bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading image...</span>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className="h-full relative rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center">
        <img
          src={image}
          alt={label}
          className="max-w-full max-h-full object-contain"
        />
        <button
          onClick={() => onImageChange(null)}
          className="absolute top-3 right-3 bg-background border border-border rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        h-full relative rounded-lg border border-dashed transition-all
        flex flex-col items-center justify-center cursor-pointer
        ${isDragging 
          ? "border-foreground bg-muted" 
          : "border-border hover:border-muted-foreground/50 bg-background"
        }
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-4" />
      <p className="text-sm font-medium text-foreground mb-1">Drop image here</p>
      <p className="text-xs text-muted-foreground mb-6">jpg, png, webp, gif, avif</p>
      
      <div 
        className="flex gap-2 w-full max-w-sm px-8 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="url"
          placeholder="Or paste image URL..."
          value={urlValue}
          onChange={(e) => { setUrlValue(e.target.value); setError(null); setDismissedLoadError(loadError ?? null) }}
          onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 pointer-events-auto"
        />
        <button 
          onClick={handleUrlSubmit} 
          disabled={isLoadingUrl || !urlValue.trim()} 
          className="h-9 px-3 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto transition-colors"
        >
          {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
        </button>
      </div>
      <p role="alert" className="text-xs text-destructive mt-3 min-h-4">{visibleError}</p>
    </div>
  )
}
