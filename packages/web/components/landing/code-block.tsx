"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import {
  copyIconHidden,
  copyLabel,
  highlightSpans,
  reportCopy,
  scheduleCopyReset,
  TONE_CLASS,
} from "@/lib/code-highlight"

interface CodeBlockProps {
  code: string
  language: "yaml" | "json"
  title: string
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const copiedNow = await reportCopy(() => navigator.clipboard.writeText(code))
    setCopied(copiedNow)
    clearTimeout(timer.current)
    scheduleCopyReset(copiedNow, () => setCopied(false), (delay, reset) => {
      timer.current = setTimeout(reset, delay)
    })
  }

  return (
    <div data-ui className="overflow-hidden rounded-2xl bg-ink-panel text-ink-panel-foreground">
      <div className="flex items-center justify-between gap-3 bg-ink-panel-raised py-2 pl-4 pr-2">
        <span className="truncate text-[14px] text-ink-panel-muted">{title}</span>
        <button
          type="button"
          onClick={copy}
          className="press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-ink-panel-foreground hover:bg-ink-panel"
        >
          <span hidden={copyIconHidden(copied, "check")}>
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <span hidden={copyIconHidden(copied, "copy")}>
            <Copy className="h-4 w-4" aria-hidden />
          </span>
          <span aria-live="polite">{copyLabel(copied)}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[13.5px] leading-[1.65]">
        <code className="font-mono">
          {code.replace(/\n$/, "").split("\n").map((line, index) => (
            <span key={index} className="block min-h-[1lh] whitespace-pre">
              {highlightSpans(line, language).map((span, spanIndex) => (
                <span key={spanIndex} className={TONE_CLASS[span.tone]}>
                  {span.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
