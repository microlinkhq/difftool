import { ImageCompareClient } from "@/components/image-compare-client"
import { jsonLdScript, structuredData } from "@/lib/metadata"

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData()) }} />
      <ImageCompareClient />
    </>
  )
}
