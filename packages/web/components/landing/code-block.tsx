"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

const COPIED_FOR_MS = 1600

const YAML_KEY = /^(\s*(?:- )?)([\w-]+)(:)(.*)$/
const JSON_KEY = /^(\s*)("[\w-]+")(:)(.*)$/

function highlightLine(line: string, language: "yaml" | "json") {
  const match = line.match(language === "yaml" ? YAML_KEY : JSON_KEY)
  if (!match) return <span className="text-code-plain">{line}</span>
  const [, indent, key, colon, value] = match
  return (
    <>
      {indent}
      <span className="text-ink-panel-foreground">{key}</span>
      <span className="text-code-punctuation">{colon}</span>
      <span className="text-code-value">{value}</span>
    </>
  )
}

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
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS)
    } catch {
      setCopied(false)
    }
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
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[13.5px] leading-[1.65]">
        <code className="font-mono">
          {code.replace(/\n$/, "").split("\n").map((line, index) => (
            <span key={index} className="block min-h-[1lh] whitespace-pre">
              {highlightLine(line, language)}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
