"use client"

import { useCallback, useState } from "react"
import { ImageIcon, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ImageUploaderProps {
  label: string
  image: string | null
  onImageChange: (url: string | null, name?: string) => void
}

export function ImageUploader({ label, image, onImageChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
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
      // Use proxy to bypass CORS restrictions
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(urlValue)}`
      
      // Fetch through proxy and convert to data URL for reliable cross-origin canvas access
      const response = await fetch(proxyUrl)
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
      
      onImageChange(dataUrl, urlValue.split("/").pop() || "URL Image")
      setShowUrlInput(false)
      setUrlValue("")
    } catch {
      alert("Failed to load image from URL. Please check the URL and try again.")
    } finally {
      setIsLoadingUrl(false)
    }
  }, [urlValue, onImageChange])

  if (image) {
    return (
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
        <Button variant="outline" size="sm" className="pointer-events-none">
          <ImageIcon className="w-4 h-4 mr-2" />
          Browse
        </Button>
      </div>
      
      {showUrlInput ? (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Enter image URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            autoFocus
          />
          <Button onClick={handleUrlSubmit} disabled={isLoadingUrl} size="sm">
            {isLoadingUrl ? "Loading..." : "Load"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowUrlInput(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Or paste image URL
        </button>
      )}
    </div>
  )
}
