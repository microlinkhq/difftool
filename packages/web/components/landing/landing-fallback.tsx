"use client"

import { ImageUploader } from "@/components/image-uploader"
import { Landing } from "./landing"

const ignore = () => {}

export function LandingFallback() {
  return (
    <Landing
      slots={
        <>
          <ImageUploader label="Production" hint="The page as it is today" image={null} onImageChange={ignore} />
          <ImageUploader label="Preview" hint="The page as this change ships it" image={null} onImageChange={ignore} />
        </>
      }
    />
  )
}
