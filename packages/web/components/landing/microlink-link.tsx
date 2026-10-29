import { MICROLINK_URL } from "@/lib/site"

export function MicrolinkLink({ children = "Microlink" }: { children?: React.ReactNode }) {
  return (
    <a
      href={MICROLINK_URL}
      className="underline decoration-current/40 underline-offset-[3px] hover:decoration-current"
    >
      {children}
    </a>
  )
}
