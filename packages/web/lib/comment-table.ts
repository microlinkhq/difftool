export type Verdict = "fail" | "warning" | "pass"

export const columnClass = (wide: boolean) => (wide ? "hidden sm:table-cell" : "")

const VERDICT_TEXT_CLASS: Record<Verdict, string> = {
  fail: "text-destructive",
  warning: "text-warning",
  pass: "text-success",
}

const VERDICT_DOT_CLASS: Record<Verdict, string> = {
  fail: "bg-destructive",
  warning: "bg-warning",
  pass: "bg-success",
}

const VERDICT_LABEL: Record<Verdict, string> = {
  fail: "Fail",
  warning: "Warning",
  pass: "Pass",
}

export const verdictClass = (verdict: Verdict) => VERDICT_TEXT_CLASS[verdict]

export const verdictDotClass = (verdict: Verdict) => VERDICT_DOT_CLASS[verdict]

export const verdictLabel = (verdict: Verdict) => VERDICT_LABEL[verdict]
