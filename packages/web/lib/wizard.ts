const secretsLinkClass =
  "press inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[16px] font-medium"

export const urlField = (valid: boolean, message: string) => ({
  invalid: !valid,
  message: valid ? "" : message,
})

export const previewUrlHidden = (kind: "vercel" | "url") => kind !== "url"

export const stepBodyClass = (last: boolean) => (last ? "min-w-0" : "min-w-0 pb-16 sm:pb-20")

export const stepConnectorClass = (last: boolean) =>
  last
    ? "hidden"
    : "absolute bottom-0 left-[21px] top-14 border-l-2 border-dotted border-input sm:left-[25px] sm:top-16"

export const secretsLinkProps = (href: string | undefined) => {
  if (!href) {
    return {
      href: undefined,
      tabIndex: -1,
      "aria-disabled": true,
      className: `${secretsLinkClass} pointer-events-none bg-muted text-muted-foreground`,
    }
  }
  return {
    href,
    className: `${secretsLinkClass} bg-foreground text-background hover:bg-foreground/85`,
  }
}
