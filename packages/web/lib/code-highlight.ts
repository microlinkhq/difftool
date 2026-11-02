export const COPIED_FOR_MS = 1600

const YAML_KEY = /^(\s*(?:- )?)([\w-]+)(:)(.*)$/
const JSON_KEY = /^(\s*)("[\w-]+")(:)(.*)$/

export const TONE_CLASS = {
  plain: "text-code-plain",
  inherit: "",
  key: "text-ink-panel-foreground",
  punctuation: "text-code-punctuation",
  value: "text-code-value",
} as const

export type Tone = keyof typeof TONE_CLASS

export type Span = { text: string; tone: Tone }

export const highlightSpans = (line: string, language: "yaml" | "json"): Span[] => {
  const match = line.match(language === "yaml" ? YAML_KEY : JSON_KEY)
  if (!match) return [{ text: line, tone: "plain" }]
  const [, indent, key, colon, value] = match
  return [
    { text: indent, tone: "inherit" },
    { text: key, tone: "key" },
    { text: colon, tone: "punctuation" },
    { text: value, tone: "value" },
  ]
}

export const reportCopy = async (write: () => Promise<void>) => {
  try {
    await write()
    return true
  } catch {
    return false
  }
}

export type CopyState = "idle" | "copied" | "failed"

const COPY_RESULT_LABELS: Record<Exclude<CopyState, "idle">, string> = { copied: "Copied", failed: "Copy failed" }

export const copyState = (copied: boolean): CopyState => (copied ? "copied" : "failed")

export const copyLabel = (state: CopyState, idle = "Copy") => (state === "idle" ? idle : COPY_RESULT_LABELS[state])

export const copyIconHidden = (state: CopyState, icon: "check" | "copy") =>
  icon === "check" ? state !== "copied" : state === "copied"

export const copyResetDelay = (state: CopyState) => (state === "idle" ? undefined : COPIED_FOR_MS)

export const scheduleCopyReset = (
  state: CopyState,
  reset: () => void,
  schedule: (delay: number, reset: () => void) => void
) => {
  const delay = copyResetDelay(state)
  if (delay === undefined) return
  schedule(delay, reset)
}
