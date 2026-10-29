"use client"

import { Columns2, CircleDot, SlidersHorizontal, Highlighter, MinusSquare } from "lucide-react"
import { COMPARISON_MODES, MODE_DETAILS, type ComparisonMode } from "@/lib/modes"

interface ModeSelectorProps {
  mode: ComparisonMode
  onModeChange: (mode: ComparisonMode) => void
  className?: string
}

const MODE_ICONS: Record<ComparisonMode, React.ReactNode> = {
  split: <Columns2 className="hidden w-4 h-4 sm:block" aria-hidden />,
  fade: <CircleDot className="hidden w-4 h-4 sm:block" aria-hidden />,
  slider: <SlidersHorizontal className="hidden w-4 h-4 sm:block" aria-hidden />,
  highlight: <Highlighter className="hidden w-4 h-4 sm:block" aria-hidden />,
  subtract: <MinusSquare className="hidden w-4 h-4 sm:block" aria-hidden />,
}

export function ModeSelector({ mode, onModeChange, className = "" }: ModeSelectorProps) {
  return (
    <div role="tablist" aria-label="Comparison mode" className={`flex items-center gap-1 overflow-x-auto ${className}`}>
      {COMPARISON_MODES.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          onClick={() => onModeChange(id)}
          className={`press flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm sm:px-3.5 ${
            mode === id
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {MODE_ICONS[id]}
          {MODE_DETAILS[id].label}
        </button>
      ))}
    </div>
  )
}
