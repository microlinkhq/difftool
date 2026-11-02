import type { Metadata } from "next"
import { ErrorPage } from "@/components/error-page"
import { CTA_CLASS, CTA_OUTLINE_CLASS } from "@/lib/cta"
import { DOCS_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Page not found · difftool",
}

export default function NotFound() {
  return (
    <ErrorPage
      title={
        <>
          We could not find <em className="italic">that</em> page
        </>
      }
      body="The link may be old or mistyped. difftool lives on one page: compare two images there, or set up the GitHub Action."
      actions={
        <>
          <a href="/" className={CTA_CLASS}>
            Go to difftool
          </a>
          <a href={DOCS_URL} className={`${CTA_OUTLINE_CLASS} inline-flex`}>
            Read the docs
          </a>
        </>
      }
    />
  )
}
