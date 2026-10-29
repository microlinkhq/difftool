"use client"

import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { GITHUB_URL, SECTIONS } from "@/lib/site"
import {
  barChildren,
  isBarScrolled,
  menuButtonLabel,
  menuIconHidden,
  menuPanelHidden,
  menuPanelKey,
  onMenuKey,
  toggleOpen,
  topBarClass,
} from "@/lib/top-bar"

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(isBarScrolled(window.scrollY))
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])
  return scrolled
}

export function Wordmark() {
  return (
    <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="microlink/difftool home">
      <img src="https://cdn.microlink.io/logo/logo.svg" alt="" width={32} height={32} className="h-8 w-8" />
      <span className="text-[18px] tracking-[-0.02em]">
        microlink/<span className="font-semibold">difftool</span>
      </span>
    </a>
  )
}

interface TopBarProps {
  children?: React.ReactNode
  sticky?: boolean
}

export function TopBar({ children, sticky = true }: TopBarProps) {
  const scrolled = useScrolled()

  return (
    <header className={topBarClass(sticky, scrolled)}>
      <div className="flex h-14 items-center justify-between gap-4 px-page">
        <Wordmark />
        {barChildren(children, <LandingNav />)}
      </div>
    </header>
  )
}

const navLinkClass =
  "press rounded-lg px-3 py-2 text-[16px] text-muted-foreground hover:bg-muted hover:text-foreground"

const MENU_ID = "phone-menu"

function PhoneMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = (event: KeyboardEvent) => onMenuKey(event, () => setOpen(false))
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={MENU_ID}
        aria-label={menuButtonLabel(open)}
        onClick={() => setOpen(toggleOpen)}
        className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
      >
        <span hidden={menuIconHidden(open, "menu")}>
          <Menu className="h-5 w-5" aria-hidden />
        </span>
        <span hidden={menuIconHidden(open, "close")}>
          <X className="h-5 w-5" aria-hidden />
        </span>
      </button>
      <div
        key={menuPanelKey(open)}
        id={MENU_ID}
        hidden={menuPanelHidden(open)}
        className="absolute inset-x-0 top-14 flex flex-col gap-1 bg-card px-page pb-5 pt-2 shadow-[var(--shadow-lifted)] animate-in fade-in slide-in-from-top-2 duration-200"
      >
          {[...SECTIONS.map((section) => ({ href: `#${section.id}`, label: section.label })), { href: GITHUB_URL, label: "GitHub" }].map(
            (link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="press rounded-xl px-3 py-3 text-[18px] font-medium hover:bg-muted"
              >
                {link.label}
              </a>
            )
          )}
      </div>
    </div>
  )
}

function LandingNav() {
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      <PhoneMenu />
      <div className="hidden items-center gap-1 lg:flex">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className={navLinkClass}>
            {section.label}
          </a>
        ))}
        <a href={GITHUB_URL} className={navLinkClass}>
          GitHub
        </a>
      </div>
      <a
        href="#setup"
        className="press ml-1 hidden h-9 items-center whitespace-nowrap rounded-full sm:inline-flex px-4 text-[16px] font-medium border border-primary text-primary hover:bg-muted"
      >
        Add to your repo
      </a>
    </nav>
  )
}
