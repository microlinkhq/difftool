"use client"

import { Columns2, CircleDot, SlidersHorizontal, Highlighter, MinusSquare } from "lucide-react"
import type { ComparisonMode } from "@/app/page"

interface ModeSelectorProps {
  mode: ComparisonMode
  onModeChange: (mode: ComparisonMode) => void
}

const modes: { id: ComparisonMode; label: string; icon: React.ReactNode }[] = [
  { id: "split", label: "Split", icon: <Columns2 className="w-4 h-4" /> },
  { id: "fade", label: "Fade", icon: <CircleDot className="w-4 h-4" /> },
  { id: "slider", label: "Slider", icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: "highlight", label: "Highlight", icon: <Highlighter className="w-4 h-4" /> },
  { id: "subtract", label: "Subtract", icon: <MinusSquare className="w-4 h-4" /> },
]

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-1 p-2 border-t border-border">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${mode === m.id 
              ? "bg-primary/10 text-primary border border-primary/30" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }
          `}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  )
}
