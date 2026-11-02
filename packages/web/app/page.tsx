import { Suspense } from "react"
import { ImageCompareClient } from "@/components/image-compare-client"
import { LandingFallback } from "@/components/landing/landing-fallback"
import { jsonLdScript, structuredData } from "@/lib/metadata"

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData()) }} />
      <Suspense fallback={<LandingFallback />}>
        <ImageCompareClient />
      </Suspense>
    </>
  )
}
