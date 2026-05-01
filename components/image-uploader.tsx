"use client"

import { useCallback, useState } from "react"
import { ImageIcon, Loader2, X } from "lucide-react"

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
      
      const urlPath = urlValue.split("?")[0]
      const fileName = urlPath.split("/").pop() || "URL Image"
      
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
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="rounded-lg border border-border bg-background min-h-[280px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading image...</span>
          </div>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="relative rounded-lg border border-border bg-muted/50 overflow-hidden min-h-[280px] flex items-center justify-center">
          <img
            src={image}
            alt={label}
            className="max-w-full max-h-[400px] object-contain"
          />
          <button
            onClick={() => onImageChange(null)}
            className="absolute top-3 right-3 bg-background border border-border rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border transition-all min-h-[280px]
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
        <p className="text-sm text-foreground mb-1">Drop image here</p>
        <p className="text-xs text-muted-foreground mb-6">jpg, png, webp, gif, heic, pdf, etc.</p>
        
        <div 
          className="flex gap-2 w-full max-w-sm px-8 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="url"
            placeholder="Or paste image URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
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
      </div>
    </div>
  )
}
