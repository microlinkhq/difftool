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
    <div className="flex items-center justify-center gap-1 py-3 bg-background">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all
            ${mode === m.id 
              ? "bg-foreground text-background font-medium" 
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
