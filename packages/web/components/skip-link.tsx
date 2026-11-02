export const MAIN_ID = "main"

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      className="sr-only rounded-lg bg-primary text-[16px] font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:px-4 focus:py-2.5"
    >
      Skip to main content
    </a>
  )
}
