"use client"

import { DiffCanvas } from "./diff-canvas"
import { subtractImages } from "@/lib/pixel-diff"

interface SubtractViewProps {
  image1: string
  image2: string
  zoom: number
}

export function SubtractView(props: SubtractViewProps) {
  return <DiffCanvas {...props} render={subtractImages} className="bg-neutral-900" />
}
