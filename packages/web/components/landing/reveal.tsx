"use client"

import { Children, isValidElement, cloneElement, useEffect, useRef, useState } from "react"

type RevealState = "idle" | "pending" | "shown"

interface RevealProps {
  children: React.ReactNode
  className?: string
}

export function Reveal({ children, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RevealState>("idle")

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === "undefined") return
    setState("pending")
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setState("shown")
        observer.disconnect()
      },
      { rootMargin: "0px 0px -12% 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} data-reveal={state === "idle" ? undefined : state} className={className}>
      {Children.map(children, (child, index) =>
        isValidElement<{ style?: React.CSSProperties }>(child)
          ? cloneElement(child, { style: { ...child.props.style, "--reveal-index": index } as React.CSSProperties })
          : child
      )}
    </div>
  )
}
