"use client"

interface SplitViewProps {
  image1: string
  image2: string
}

export function SplitView({ image1, image2 }: SplitViewProps) {
  return (
    <div className="h-full w-full flex">
      <div className="flex-1 p-4 flex items-center justify-center border-r border-border">
        <img
          src={image1}
          alt="Base image"
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      </div>
      <div className="flex-1 p-4 flex items-center justify-center">
        <img
          src={image2}
          alt="Compare image"
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
        />
      </div>
    </div>
  )
}
