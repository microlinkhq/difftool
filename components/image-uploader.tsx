"use client"

import { useCallback, useState } from "react"
import { ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ImageUploaderProps {
  label: string
  image: string | null
  onImageChange: (dataUrl: string | null, name?: string, originalUrl?: string) => void
  isLoading?: boolean
}

export function ImageUploader({ label, image, onImageChange, isLoading }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        onImageChange(event.target?.result as string, file.name)
      }
      reader.readAsDataURL(file)
    }
  }, [onImageChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        onImageChange(event.target?.result as string, file.name)
      }
      reader.readAsDataURL(file)
    }
  }, [onImageChange])

  const handleUrlSubmit = useCallback(async () => {
    if (!urlValue.trim()) return
    setIsLoadingUrl(true)
    try {
      // Fetch image directly and convert to data URL for reliable canvas access
      const response = await fetch(urlValue)
      if (!response.ok) {
        throw new Error("Failed to fetch image")
      }
      
      const blob = await response.blob()
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read image"))
        reader.readAsDataURL(blob)
      })
      
      // Extract filename from URL path (before query params)
      const urlPath = urlValue.split("?")[0]
      const fileName = urlPath.split("/").pop() || "URL Image"
      
      // Pass the original URL so it can be stored in query params
      onImageChange(dataUrl, fileName, urlValue)
      setUrlValue("")
    } catch {
      alert("Failed to load image from URL. Please check the URL and try again.")
    } finally {
      setIsLoadingUrl(false)
    }
  }, [urlValue, onImageChange])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 aspect-video flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading image...</span>
          </div>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="relative rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden aspect-video">
          <img
            src={image}
            alt={label}
            className="w-full h-full object-contain"
          />
          <button
            onClick={() => onImageChange(null)}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed transition-colors
          flex flex-col items-center justify-center
          aspect-video cursor-pointer
          ${isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border bg-muted/30 hover:border-muted-foreground/50"
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Drop image here</p>
        <p className="text-xs text-muted-foreground mb-4">jpg, png, webp, gif, heic, pdf, etc.</p>
        
        <div 
          className="flex gap-2 w-full max-w-md px-6 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            type="url"
            placeholder="Or paste image URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="bg-background pointer-events-auto"
          />
          <Button 
            onClick={handleUrlSubmit} 
            disabled={isLoadingUrl || !urlValue.trim()} 
            size="sm"
            className="pointer-events-auto"
          >
            {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
          </Button>
        </div>
      </div>
    </div>
  )
}
