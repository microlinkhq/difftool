"use client"

import { DiffCanvas } from "./diff-canvas"
import { highlightDifferences } from "@/lib/pixel-diff"

interface HighlightViewProps {
  image1: string
  image2: string
  zoom: number
}

export function HighlightView(props: HighlightViewProps) {
  return <DiffCanvas {...props} render={highlightDifferences} />
}
