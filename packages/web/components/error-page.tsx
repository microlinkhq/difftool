import { SkipLink, MAIN_ID } from "@/components/skip-link"
import { Wordmark } from "@/components/top-bar"
import { BrushStroke } from "@/components/landing/brush-stroke"
import { SiteFooter } from "@/components/landing/site-footer"

interface ErrorPageProps {
  title: React.ReactNode
  body: React.ReactNode
  actions: React.ReactNode
}

export function ErrorPage({ title, body, actions }: ErrorPageProps) {
  return (
    <>
      <SkipLink />
      <header className="flex h-16 items-center border-b border-border px-page">
        <Wordmark />
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="px-page py-32 text-center focus:outline-none md:py-44">
        <h1 className="mx-auto max-w-[18ch] text-balance font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.05] tracking-[-0.03em]">
          {title}
        </h1>
        <BrushStroke className="mx-auto mt-6 block" />
        <p className="mx-auto mt-5 max-w-[48ch] text-pretty text-[18px] leading-[1.6] text-muted-foreground">{body}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </main>
      <SiteFooter />
    </>
  )
}
