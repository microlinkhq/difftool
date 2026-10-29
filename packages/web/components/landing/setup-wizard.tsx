"use client"

import { useId, useMemo, useState } from "react"
import { ArrowUpRight, Database, Gauge, GitPullRequest, Globe, Plus, X } from "lucide-react"
import { CodeBlock } from "./code-block"
import { Reveal } from "./reveal"
import { optionSelected, segmentButtonClass, segmentLayout } from "@/lib/segment-layout"
import { DOCS_URL, MICROLINK_DASHBOARD_URL } from "@/lib/site"
import { previewUrlHidden, secretsLinkProps, stepBodyClass, stepConnectorClass, urlField } from "@/lib/wizard"
import {
  DEFAULT_THRESHOLD,
  MICROLINK_SECRET,
  S3_SECRET,
  STORAGE_PROVIDERS,
  WORKFLOW_PATH,
  addRoute,
  addRouteDisabled,
  buildWorkflow,
  commitOnEnter,
  formatPercent,
  isHttpUrl,
  isPreviewValid,
  previewInput,
  removeRouteDisabled,
  secretsHref,
  storageConfig,
  type StorageProvider,
} from "@/lib/workflow"

const THRESHOLD_PRESETS = [
  { value: DEFAULT_THRESHOLD, label: "Strict", detail: "0.1%" },
  { value: 0.01, label: "Relaxed", detail: "1%" },
  { value: 0.03, label: "Loose", detail: "3%" },
]

const WARNING_THRESHOLD_PERCENT = 5

const inputClass =
  "h-11 w-full rounded-xl bg-muted px-4 text-[16px] placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive"

interface StepProps {
  icon: React.ReactNode
  title: string
  description: React.ReactNode
  children: React.ReactNode
  last?: boolean
}

function Step({ icon, title, description, children, last = false }: StepProps) {
  return (
    <li className="relative grid grid-cols-[44px_1fr] gap-x-5 sm:grid-cols-[52px_1fr] sm:gap-x-8">
      <span aria-hidden className={stepConnectorClass(last)} />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground sm:h-[52px] sm:w-[52px]">
        {icon}
      </span>
      <div className={stepBodyClass(last)}>
        <h3 className="pt-2 text-[22px] font-semibold tracking-[-0.02em] sm:pt-3">{title}</h3>
        <div className="mt-2 max-w-[60ch] text-[16px] leading-[1.6] text-muted-foreground">{description}</div>
        <div className="mt-6">{children}</div>
      </div>
    </li>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1 rounded-2xl bg-muted p-1 ${segmentLayout(options.length)}`}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={optionSelected(value, option.value)}
          onClick={() => onChange(option.value)}
          className={`press whitespace-nowrap rounded-xl px-3 py-2 text-[16px] sm:px-4 ${segmentButtonClass(optionSelected(value, option.value))}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function RouteList({ routes, onChange }: { routes: string[]; onChange: (routes: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const inputId = useId()

  const commit = () => {
    onChange(addRoute(routes, draft))
    setDraft("")
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-[16px] font-medium">
        Routes to compare
      </label>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Routes">
        {routes.map((route) => (
          <li key={route} className="inline-flex h-9 items-center gap-1 rounded-full bg-muted pl-3.5 pr-1">
            <code className="font-mono text-[14px]">{route}</code>
            <button
              type="button"
              onClick={() => onChange(routes.filter((item) => item !== route))}
              disabled={removeRouteDisabled(routes.length)}
              aria-label={`Remove ${route}`}
              className="press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          id={inputId}
          value={draft}
          placeholder="/pricing"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => commitOnEnter(event, commit)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={commit}
          disabled={addRouteDisabled(draft)}
          className="press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[16px] font-medium border border-primary text-primary hover:bg-muted disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </button>
      </div>
    </div>
  )
}

export function SetupWizard() {
  const [base, setBase] = useState("https://example.com")
  const [previewKind, setPreviewKind] = useState<"vercel" | "url">("vercel")
  const [previewUrl, setPreviewUrl] = useState("")
  const [routes, setRoutes] = useState(["/"])
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [provider, setProvider] = useState<StorageProvider>("r2")
  const [repository, setRepository] = useState("")
  const [useApiKey, setUseApiKey] = useState(true)

  const ids = { base: useId(), baseError: useId(), preview: useId(), previewError: useId(), repo: useId(), apiKey: useId() }

  const baseValid = isHttpUrl(base)
  const previewValid = isPreviewValid(previewKind, previewUrl)
  const production = urlField(baseValid, "Use a full address, like https://example.com")
  const preview = urlField(previewValid, "Use a full address, like https://staging.example.com")

  const workflow = useMemo(
    () =>
      buildWorkflow({
        base,
        preview: previewInput(previewKind, previewUrl),
        routes,
        threshold,
        useApiKey,
      }),
    [base, previewKind, previewUrl, routes, threshold, useApiKey]
  )

  return (
    <section id="setup" aria-labelledby="setup-title" className="px-page">
      <div className="mx-auto max-w-[1280px] rounded-[32px] bg-card px-5 py-16 shadow-[var(--shadow-ring)] sm:px-10 md:py-24">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <h2 id="setup-title" className="font-serif text-[clamp(2.25rem,4.4vw,4rem)] font-normal leading-[1] tracking-[-0.03em]">
            Add it to <em className="italic">your</em> repo
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-[18px] leading-[1.6] text-muted-foreground">
            Answer four questions and copy one workflow file. The action finds the preview, takes the screenshots
            and cleans up after the pull request closes.
          </p>
        </Reveal>

        <ol className="mx-auto mt-16 max-w-[760px] md:mt-20">
          <Step
            icon={<Globe className="h-5 w-5" aria-hidden />}
            title="Point it at your site"
            description="Production is what your users see today. The preview is what this pull request would ship."
          >
            <div className="flex flex-col gap-7">
              <div>
                <label htmlFor={ids.base} className="text-[16px] font-medium">
                  Production URL
                </label>
                <input
                  id={ids.base}
                  type="url"
                  inputMode="url"
                  value={base}
                  onChange={(event) => setBase(event.target.value)}
                  aria-invalid={production.invalid}
                  aria-describedby={ids.baseError}
                  className={`${inputClass} mt-2`}
                />
                <p id={ids.baseError} className="mt-1.5 min-h-5 text-[14px] text-destructive">
                  {production.message}
                </p>
              </div>

              <div>
                <p className="text-[16px] font-medium" id={ids.preview}>
                  Preview deploys
                </p>
                <div className="mt-2">
                  <Segmented
                    label="Preview deploys"
                    value={previewKind}
                    onChange={setPreviewKind}
                    options={[
                      { value: "vercel", label: "Found on Vercel" },
                      { value: "url", label: "A fixed URL" },
                    ]}
                  />
                </div>
                <div className="mt-3" hidden={previewUrlHidden(previewKind)}>
                  <input
                    type="url"
                    inputMode="url"
                    value={previewUrl}
                    placeholder="https://staging.example.com"
                    onChange={(event) => setPreviewUrl(event.target.value)}
                    aria-labelledby={ids.preview}
                    aria-invalid={preview.invalid}
                    aria-describedby={ids.previewError}
                    className={inputClass}
                  />
                  <p id={ids.previewError} className="mt-1.5 min-h-5 text-[14px] text-destructive">
                    {preview.message}
                  </p>
                </div>
              </div>

              <RouteList routes={routes} onChange={setRoutes} />
            </div>
          </Step>

          <Step
            icon={<Gauge className="h-5 w-5" aria-hidden />}
            title="Decide how strict it is"
            description={
              <>
                A route passes while at most <strong className="font-semibold text-foreground">{formatPercent(threshold)}</strong> of
                its pixels change. Up to {WARNING_THRESHOLD_PERCENT}% it is a warning; beyond that the check fails.
              </>
            }
          >
            <Segmented
              label="Threshold"
              value={threshold}
              onChange={setThreshold}
              options={THRESHOLD_PRESETS.map((preset) => ({
                value: preset.value,
                label: (
                  <>
                    {preset.label} <span className="tabular-nums text-muted-foreground">{preset.detail}</span>
                  </>
                ),
              }))}
            />
          </Step>

          <Step
            icon={<Database className="h-5 w-5" aria-hidden />}
            title="Give it a bucket"
            description={
              <>
                Screenshots go to an S3-compatible bucket you own, so private repos stay private. Save this as a
                repository secret named <code className="font-mono text-[14px] text-foreground">{S3_SECRET}</code>.
              </>
            }
          >
            <div className="flex flex-col gap-5">
              <Segmented
                label="Storage provider"
                value={provider}
                onChange={setProvider}
                options={STORAGE_PROVIDERS.map((item) => ({ value: item.id, label: item.label }))}
              />
              <CodeBlock code={storageConfig(provider)} language="json" title={S3_SECRET} />

              <label htmlFor={ids.apiKey} className="flex max-w-[60ch] cursor-pointer items-start gap-3 text-[16px] leading-[1.55]">
                <input
                  id={ids.apiKey}
                  type="checkbox"
                  checked={useApiKey}
                  onChange={(event) => setUseApiKey(event.target.checked)}
                  className="mt-1 h-[18px] w-[18px] shrink-0 accent-primary"
                />
                <span>
                  Use a Microlink API key, saved as <code className="font-mono text-[14px]">{MICROLINK_SECRET}</code>.{" "}
                  <span className="text-muted-foreground">
                    Without one, screenshots run on the free endpoint, 5 requests a day.{" "}
                    <a href={MICROLINK_DASHBOARD_URL} className="text-link hover:text-link-hover hover:underline">
                      Get a key
                    </a>
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <label htmlFor={ids.repo} className="sr-only">
                    Your repository
                  </label>
                  <input
                    id={ids.repo}
                    value={repository}
                    placeholder="owner/repository"
                    onChange={(event) => setRepository(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <a {...secretsLinkProps(secretsHref(repository))}>
                  Open its secrets
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          </Step>

          <Step
            icon={<GitPullRequest className="h-5 w-5" aria-hidden />}
            title="Commit the workflow"
            description="Push this file and open a pull request. The comment appears as soon as the preview is ready."
            last
          >
            <CodeBlock code={workflow} language="yaml" title={WORKFLOW_PATH} />
          </Step>
        </ol>

        <div className="mx-auto mt-16 flex max-w-[760px] justify-center">
          <a
            href={DOCS_URL}
            className="press inline-flex h-12 items-center gap-2 rounded-full px-6 text-[16px] font-medium border border-primary text-primary hover:bg-muted"
          >
            Read the docs
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}
