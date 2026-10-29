export const COMPARISON_MODES = ["split", "fade", "slider", "highlight", "subtract"] as const

export type ComparisonMode = (typeof COMPARISON_MODES)[number]

export const MODE_DETAILS: Record<ComparisonMode, { label: string; summary: string }> = {
  split: {
    label: "Split",
    summary: "Production and preview side by side, scrolled and zoomed together.",
  },
  fade: {
    label: "Fade",
    summary: "One on top of the other. Drag the opacity and watch what shifts.",
  },
  slider: {
    label: "Slider",
    summary: "A curtain between the two. Drag it across the part you care about.",
  },
  highlight: {
    label: "Highlight",
    summary: "The production page with every changed pixel painted pink.",
  },
  subtract: {
    label: "Subtract",
    summary: "Black where nothing moved. Anything bright is a difference.",
  },
}
