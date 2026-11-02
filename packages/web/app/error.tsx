"use client"

import { ErrorPage } from "@/components/error-page"
import { CTA_CLASS, CTA_OUTLINE_CLASS } from "@/lib/cta"
import { GITHUB_URL } from "@/lib/site"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <ErrorPage
      title="Something went wrong on our side"
      body={
        <>
          The page failed to load. Try again, and if it keeps failing, open an issue
          {error.digest ? (
            <>
              {" "}
              with reference <code className="font-mono text-[16px] text-foreground">{error.digest}</code>
            </>
          ) : null}
          .
        </>
      }
      actions={
        <>
          <button type="button" onClick={reset} className={CTA_CLASS}>
            Try again
          </button>
          <a href={`${GITHUB_URL}/issues/new`} className={`${CTA_OUTLINE_CLASS} inline-flex`}>
            Open an issue
          </a>
        </>
      }
    />
  )
}
