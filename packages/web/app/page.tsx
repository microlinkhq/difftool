import { Suspense } from "react"
import { ImageCompareClient } from "@/components/image-compare-client"
import { LandingFallback } from "@/components/landing/landing-fallback"

export default function Home() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <ImageCompareClient />
    </Suspense>
  )
}
