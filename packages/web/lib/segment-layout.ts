const SEGMENT_LAYOUT: Record<number, string> = {
  2: "grid-flow-col auto-cols-fr",
  3: "grid-cols-1 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr",
  4: "grid-cols-2 sm:grid-cols-4",
}

export const segmentLayout = (count: number) => SEGMENT_LAYOUT[count] ?? SEGMENT_LAYOUT[2]

export const optionSelected = <T extends string | number>(value: T, option: T) => value === option

export const segmentButtonClass = (selected: boolean) =>
  selected
    ? "bg-background font-medium text-foreground"
    : "text-muted-foreground hover:text-foreground"
