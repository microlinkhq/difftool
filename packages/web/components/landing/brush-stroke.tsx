import { useId } from "react"

const STROKE_PATH =
  "M4 11.4c8-3.2 18-4.6 30-3.2 11 1.2 18-2.2 31-1 15 1.4 22 3.2 37 1.4 12-1.4 25.2.2 38-.6 4.2-.2 7.6.8 8.6 1.6-3.6 2.6-10 1.6-18.4 0-15.4-2.8-28-4.2-42.4-.4-13 3.4-21 5.4-34.4 2.6-15-3-28 .6-42.4 2.2C7.2 15.2 4.6 13 4 11.4Z"

export function BrushStroke({ className = "" }: { className?: string }) {
  const filterId = useId()
  return (
    <svg aria-hidden viewBox="0 0 148 22" className={`h-3.5 w-32 text-brush-stroke ${className}`}>
      <filter id={filterId} x="-4%" y="-40%" width="108%" height="180%">
        <feGaussianBlur stdDeviation="0.7" />
      </filter>
      <path fill="currentColor" filter={`url(#${filterId})`} d={STROKE_PATH} />
    </svg>
  )
}
