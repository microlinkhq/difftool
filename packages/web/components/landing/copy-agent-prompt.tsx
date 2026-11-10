"use client"

import { Check, Copy } from "lucide-react"
import { useCopy } from "@/hooks/use-copy"
import { copyIconHidden, copyLabel } from "@/lib/code-highlight"
import { CTA_OUTLINE_CLASS } from "@/lib/cta"
import { DOCS_URL, MICROLINK_DASHBOARD_URL, SITE_URL } from "@/lib/site"
import { buildAgentPrompt } from "@/lib/workflow"

const AGENT_PROMPT = buildAgentPrompt({ docsUrl: DOCS_URL, dashboardUrl: MICROLINK_DASHBOARD_URL, siteUrl: SITE_URL })

export function CopyAgentPrompt({ className }: { className?: string }) {
  const { state, copy } = useCopy(AGENT_PROMPT)

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy a prompt that lets any coding agent set up difftool in your repository"
      className={`${CTA_OUTLINE_CLASS} inline-flex ${className ?? ""}`}
    >
      <span hidden={copyIconHidden(state, "check")}>
        <Check className="h-4 w-4" aria-hidden />
      </span>
      <span hidden={copyIconHidden(state, "copy")}>
        <Copy className="h-4 w-4" aria-hidden />
      </span>
      <span aria-live="polite">{copyLabel(state, "Copy prompt for your agent")}</span>
    </button>
  )
}
