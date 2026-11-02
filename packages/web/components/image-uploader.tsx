"use client"

import { useCallback, useRef, useState } from "react"
import { Database, GitBranch, Link, Loader2, X } from "lucide-react"
import { leavesZone } from "@/lib/drop-zone"
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
    if (leavesZone(e.currentTarget, e.relatedTarget)) setIsDragging(false)
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

  const mark = label === "Preview"
    ? { Icon: GitBranch, chip: "bg-primary/10 text-primary-ink" }
    : { Icon: Database, chip: "bg-muted text-foreground" }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col gap-4 rounded-xl ${isDragging ? "bg-brand/5" : ""}`}
    >
      <div className="flex items-center gap-3">
        <label className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${mark.chip}`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            aria-label={`Choose the ${label.toLowerCase()} image`}
            className="sr-only"
          />
          <mark.Icon className="h-5 w-5" aria-hidden />
        </label>
        <div>
          <p className="text-[20px] font-semibold leading-none tracking-[-0.02em]">{label}</p>
          <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{hint}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" aria-hidden />
          <input
            type="url"
            inputMode="url"
            placeholder="https://..."
            aria-label={`${label} image URL`}
            value={urlValue}
            onChange={(e) => { setUrlValue(e.target.value); setError(null); setDismissedLoadError(loadError ?? null) }}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="h-11 w-full rounded-xl border border-field-border bg-card pl-10 pr-4 text-[15px] placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={handleUrlSubmit}
          disabled={isLoadingUrl || !urlValue.trim()}
          className="press h-11 shrink-0 rounded-xl border border-field-border bg-card px-4 text-[15px] font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-card"
        >
          {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" /> : "Load"}
        </button>
      </div>
      {visibleError ? <p role="alert" className="text-[14px] text-destructive">{visibleError}</p> : null}
    </div>
  )
}
