import { Suspense } from "react"
import { ImageCompareClient } from "@/components/image-compare-client"

export type ComparisonMode = "split" | "fade" | "slider" | "highlight" | "subtract"

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">Image Diff Compare</h1>
          <p className="text-muted-foreground">
            Compare two images using different visualization modes
          </p>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ImageCompareClient />
    </Suspense>
  )
}
