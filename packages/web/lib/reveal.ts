import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react"

export type RevealState = "idle" | "pending" | "shown"

export const revealAttribute = (state: RevealState) => (state === "idle" ? undefined : state)

export const showWhenNear = <T>(near: boolean, view: T): T | null => (near ? view : null)

export const mapRevealChild = (child: ReactNode, index: number): ReactNode => {
  if (!isValidElement<{ style?: CSSProperties }>(child)) return child
  return cloneElement(child as ReactElement<{ style?: CSSProperties }>, {
    style: { ...child.props.style, "--reveal-index": index } as CSSProperties,
  })
}

export const observeWhenVisible = (
  element: unknown,
  Observer: typeof IntersectionObserver | undefined,
  options: IntersectionObserverInit,
  hooks: { onStart?: () => void; onVisible: () => void }
) => {
  if (element == null || typeof Observer !== "function") return () => {}
  let seen = false
  let observer!: IntersectionObserver
  observer = new Observer((entries) => {
    if (seen) return
    const entry = entries[0]
    if (!entry?.isIntersecting) return
    seen = true
    hooks.onVisible()
    observer.disconnect()
  }, options)
  hooks.onStart?.()
  observer.observe(element as Element)
  return () => observer.disconnect()
}
