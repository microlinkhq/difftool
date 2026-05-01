"use client"

interface SplitViewProps {
  image1: string
  image2: string
  zoom: number
}

export function SplitView({ image1, image2, zoom }: SplitViewProps) {
  const scale = zoom / 100

  return (
    <div className="h-full w-full flex">
      <div className="flex-1 p-4 overflow-auto border-r border-border">
        <div className="min-h-full flex items-start justify-center">
          <img
            src={image1}
            alt="Base image"
            className="object-contain rounded-lg shadow-lg origin-top"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          />
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="min-h-full flex items-start justify-center">
          <img
            src={image2}
            alt="Compare image"
            className="object-contain rounded-lg shadow-lg origin-top"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          />
        </div>
      </div>
    </div>
  )
}
