import { Plus } from "lucide-react"
import { BrushStroke } from "./brush-stroke"
import { MicrolinkLink } from "./microlink-link"
import { Reveal } from "./reveal"

const QUESTIONS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "Does it work on private repositories?",
    answer:
      "Yes. Screenshots are uploaded to your own bucket and the comment links to pre-signed URLs, so anyone who can see the pull request can open them while the bucket stays private. The links expire after 24 hours by default and are refreshed on every run.",
  },
  {
    question: "I don't deploy previews on Vercel.",
    answer:
      "Pass any URL as head instead of vercel. If your host gives each pull request its own address, work it out in an earlier step of the job and hand it to the action.",
  },
  {
    question: "What happens when a page is meant to change?",
    answer:
      "Small changes come back as warnings and the check stays green. A redesign changes more than 5% of the page and fails it, which is the point: someone has to look. Open the compare link, confirm it is the change you wanted, and merge. For pages that are always noisy, raise threshold and warning-threshold in the workflow.",
  },
  {
    question: "Which storage can I use?",
    answer:
      "Anything that speaks the S3 API: Cloudflare R2, AWS S3, Backblaze B2, MinIO, DigitalOcean Spaces. The token only needs to put, get, delete and list objects in that one bucket. When a pull request closes, everything under its prefix is deleted.",
  },
  {
    question: "What does it cost?",
    answer: (
      <>
        The action is free and MIT licensed. Screenshots are <MicrolinkLink /> API requests: without a key they use the
        free endpoint, 5 a day, which is enough to try it. A plan raises the limit for real CI traffic.
      </>
    ),
  },
  {
    question: "Are images I drop on this page uploaded?",
    answer:
      "No. Files are read and compared by your browser, on your machine. Pasting an image URL makes your browser fetch it directly.",
  },
]

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="px-page">
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <h2 id="faq-title" className="font-serif text-[clamp(2.25rem,4.4vw,4rem)] font-normal leading-[1] tracking-[-0.03em]">
            <em className="italic">Questions</em>
          </h2>
          <BrushStroke className="mt-6 block" />
          <p className="mt-5 max-w-[34ch] text-[18px] leading-[1.6] text-muted-foreground">
            Something else? Open an issue on GitHub and it will get an answer.
          </p>
        </Reveal>
        <Reveal className="flex flex-col gap-2 lg:col-span-8">
          {QUESTIONS.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl bg-muted">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-[18px] font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                {question}
                <Plus className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="max-w-[64ch] px-6 pb-6 text-[16px] leading-[1.6] text-muted-foreground">{answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
