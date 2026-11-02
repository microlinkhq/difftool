import { useEffect, useRef, useState } from "react"
import { copyState, reportCopy, scheduleCopyReset, type CopyState } from "@/lib/code-highlight"

export function useCopy(text: string) {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const next = copyState(await reportCopy(() => navigator.clipboard.writeText(text)))
    setState(next)
    clearTimeout(timer.current)
    scheduleCopyReset(next, () => setState("idle"), (delay, reset) => {
      timer.current = setTimeout(reset, delay)
    })
  }

  return { state, copy }
}
