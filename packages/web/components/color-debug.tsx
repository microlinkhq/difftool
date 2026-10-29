"use client"

import dynamic from "next/dynamic"

const ColorDebugPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./color-debug-panel").then((module) => module.ColorDebugPanel), { ssr: false })
    : () => null

export function ColorDebug() {
  return <ColorDebugPanel />
}
