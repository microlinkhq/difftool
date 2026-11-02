import { useEffect, useRef, useState } from "react"
import { reportCopy, scheduleCopyReset } from "@/lib/code-highlight"

export function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const copiedNow = await reportCopy(() => navigator.clipboard.writeText(text))
    setCopied(copiedNow)
    clearTimeout(timer.current)
    scheduleCopyReset(copiedNow, () => setCopied(false), (delay, reset) => {
      timer.current = setTimeout(reset, delay)
    })
  }

  return { copied, copy }
}
