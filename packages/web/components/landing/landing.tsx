import { TopBar } from "@/components/top-bar"
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
      <TopBar />
      <main>
        <Hero slots={slots} onTryExample={onTryExample} />
        <div className="flex flex-col gap-32 pt-8 md:gap-44">
          <HowItWorks />
          <ModesDemo />
          <SetupWizard />
          <Faq />
        </div>
      </main>
      <div className="mt-32 md:mt-44">
        <SiteFooter />
      </div>
    </>
  )
}
