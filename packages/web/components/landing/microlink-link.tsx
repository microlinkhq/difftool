import { TEXT_LINK_CLASS } from "@/lib/link"
import { MICROLINK_URL } from "@/lib/site"

export function MicrolinkLink({ children = "Microlink" }: { children?: React.ReactNode }) {
  return (
    <a href={MICROLINK_URL} className={TEXT_LINK_CLASS}>
      {children}
    </a>
  )
}
