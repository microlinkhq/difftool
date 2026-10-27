"use client"

import { useEffect, useState } from "react"

export type ImagePair =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; base: HTMLImageElement; head: HTMLImageElement }

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not decode ${src.slice(0, 64)}`))
    image.src = src
  })

export function useImagePair(baseSrc: string, headSrc: string): ImagePair {
  const [pair, setPair] = useState<ImagePair>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    setPair({ status: "loading" })
    Promise.all([loadImage(baseSrc), loadImage(headSrc)]).then(
      ([base, head]) => { if (!cancelled) setPair({ status: "ready", base, head }) },
      () => { if (!cancelled) setPair({ status: "error" }) }
    )
    return () => { cancelled = true }
  }, [baseSrc, headSrc])

  return pair
}
