export const SCROLLED_AFTER_PX = 8

export const isBarScrolled = (scrollY: number) => scrollY > SCROLLED_AFTER_PX

export const topBarClass = (sticky: boolean, scrolled: boolean) =>
  [
    sticky ? "sticky top-0" : "",
    "z-40 transition-colors duration-200",
    scrolled && sticky ? "bg-card shadow-[0_1px_0_rgba(var(--shadow-ink),0.1)]" : "bg-card",
  ]
    .filter(Boolean)
    .join(" ")

export const toggleOpen = (open: boolean) => !open

export const barChildren = <T>(children: T | undefined, fallback: T): T => children ?? fallback

export const onMenuKey = (event: { key: string }, close: () => void) => {
  if (event.key !== "Escape") return
  close()
}

export const menuButtonLabel = (open: boolean) => (open ? "Close menu" : "Open menu")

export const menuPanelHidden = (open: boolean) => !open

export const menuPanelKey = (open: boolean) => (open ? "open" : "closed")

export const menuIconHidden = (open: boolean, icon: "menu" | "close") =>
  icon === "close" ? !open : open
