const secretsLinkClass =
  "press inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[16px] font-medium"

export const urlField = (value: string, valid: boolean, message: string) => {
  const invalid = value.trim() !== "" && !valid
  return { invalid, message: invalid ? message : "" }
}

export const previewUrlHidden = (kind: "vercel" | "url") => kind !== "url"

const STEP_BODY_CLASS = "col-span-2 min-w-0 sm:col-span-1 sm:col-start-2"

export const stepBodyClass = (last: boolean) => (last ? STEP_BODY_CLASS : `${STEP_BODY_CLASS} pb-16 sm:pb-20`)

export const stepConnectorClass = (last: boolean) =>
  last
    ? "hidden"
    : "absolute bottom-0 left-[25px] top-16 hidden border-l-2 border-dotted border-input sm:block"

export const secretsLinkProps = (href: string | undefined) => {
  if (!href) {
    return {
      href: undefined,
      tabIndex: -1,
      "aria-disabled": true,
      className: `${secretsLinkClass} pointer-events-none border border-border text-muted-foreground`,
    }
  }
  return {
    href,
    className: `${secretsLinkClass} border border-primary text-primary-ink hover:bg-muted`,
  }
}
