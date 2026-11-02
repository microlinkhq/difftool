import { TopBar } from "@/components/top-bar"
import { MAIN_ID, SkipLink } from "@/components/skip-link"
import { Hero } from "./hero"
import { HowItWorks } from "./how-it-works"
import { ModesDemo } from "./modes-demo"
import { SetupWizard } from "./setup-wizard"
import { Faq } from "./faq"
import { SiteFooter } from "./site-footer"

interface LandingProps {
  slots: React.ReactNode
  onTryExample?: () => void
}

export function Landing({ slots, onTryExample }: LandingProps) {
  return (
    <>
      <SkipLink />
      <TopBar />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <Hero slots={slots} onTryExample={onTryExample} />
        <div className="flex flex-col gap-24 pt-8 sm:gap-32 md:gap-44">
          <HowItWorks />
          <ModesDemo />
          <SetupWizard />
          <Faq />
        </div>
      </main>
      <div className="mt-24 sm:mt-32 md:mt-44">
        <SiteFooter />
      </div>
    </>
  )
}
