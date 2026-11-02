import type { MetadataRoute } from "next"
import { manifest as buildManifest } from "@/lib/metadata"

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest()
}
