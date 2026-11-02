"use client"

import { Children, useEffect, useRef, useState } from "react"
import { mapRevealChild, observeWhenVisible, revealAttribute, type RevealState } from "@/lib/reveal"

interface RevealProps {
  children: React.ReactNode
  className?: string
}

export function Reveal({ children, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RevealState>("idle")

  useEffect(
    () =>
      observeWhenVisible(ref.current, globalThis.IntersectionObserver, { rootMargin: "0px 0px -12% 0px" }, {
        onStart: () => setState("pending"),
        onVisible: () => setState("shown"),
      }),
    []
  )

  return (
    <div ref={ref} data-reveal={revealAttribute(state)} className={className}>
      {Children.map(children, (child, index) => mapRevealChild(child, index))}
    </div>
  )
}
