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
      <div className="flex-1 p-4 pb-16 overflow-auto border-r border-border">
        <div className="min-h-full flex items-start justify-center-safe">
          <img
            src={image1}
            alt="Base image"
            className="max-w-none rounded-lg shadow-lg"
            style={{ zoom: scale }}
          />
        </div>
      </div>
      <div className="flex-1 p-4 pb-16 overflow-auto">
        <div className="min-h-full flex items-start justify-center-safe">
          <img
            src={image2}
            alt="Compare image"
            className="max-w-none rounded-lg shadow-lg"
            style={{ zoom: scale }}
          />
        </div>
      </div>
    </div>
  )
}
