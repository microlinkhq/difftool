export const columnClass = (wide: boolean) => (wide ? "hidden sm:table-cell" : "")

export const verdictClass = (verdict: "fail" | "pass") =>
  verdict === "fail" ? "text-destructive" : "text-success"

export const verdictLabel = (verdict: "fail" | "pass") => (verdict === "fail" ? "Fail" : "Pass")
