export const DEFAULT_THRESHOLD = 0.001
export const WORKFLOW_PATH = ".github/workflows/visual-diff.yml"
export const S3_SECRET = "S3_CONFIG"
export const MICROLINK_SECRET = "MICROLINK_API_KEY"

export type Preview = { kind: "vercel" } | { kind: "url"; url: string }

export interface WorkflowOptions {
  base: string
  preview: Preview
  routes: string[]
  threshold: number
  useApiKey: boolean
}

export type StorageProvider = "r2" | "aws" | "b2" | "minio"

export const STORAGE_PROVIDERS: { id: StorageProvider; label: string }[] = [
  { id: "r2", label: "Cloudflare R2" },
  { id: "aws", label: "AWS S3" },
  { id: "b2", label: "Backblaze B2" },
  { id: "minio", label: "MinIO" },
]

const STORAGE_CONFIGS: Record<StorageProvider, Record<string, string | boolean>> = {
  r2: {
    endpoint: "https://<account-id>.r2.cloudflarestorage.com",
    region: "auto",
    accessKeyId: "...",
    secretAccessKey: "...",
    bucket: "difftool-assets",
    forcePathStyle: true,
  },
  aws: {
    region: "us-east-1",
    accessKeyId: "...",
    secretAccessKey: "...",
    bucket: "difftool-assets",
  },
  b2: {
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
    accessKeyId: "...",
    secretAccessKey: "...",
    bucket: "difftool-assets",
    forcePathStyle: true,
  },
  minio: {
    endpoint: "https://minio.example.com",
    region: "us-east-1",
    accessKeyId: "...",
    secretAccessKey: "...",
    bucket: "difftool-assets",
    forcePathStyle: true,
  },
}

export const storageConfig = (provider: StorageProvider) =>
  JSON.stringify(STORAGE_CONFIGS[provider], null, 2)

export const isHttpUrl = (value: string) => {
  try {
    const { protocol, hostname } = new URL(value.trim())
    return (protocol === "http:" || protocol === "https:") && hostname.includes(".")
  } catch {
    return false
  }
}

export const BASE_URL_EXAMPLE = "https://example.com"
export const PREVIEW_URL_EXAMPLE = "https://staging.example.com"

export const urlOrExample = (value: string, example: string) => (isHttpUrl(value) ? value.trim() : example)

export const isPreviewValid = (kind: Preview["kind"], url: string) =>
  kind === "vercel" || isHttpUrl(url)

export const previewInput = (kind: Preview["kind"], url: string): Preview =>
  kind === "vercel" ? { kind: "vercel" } : { kind: "url", url }

export const normalizeRoute = (value: string) => {
  const trimmed = value.replace(/\s+/g, "")
  if (!trimmed) return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

export const addRoute = (routes: string[], value: string) => {
  const route = normalizeRoute(value)
  if (!route || routes.includes(route)) return routes
  return [...routes, route]
}

export const removeRouteDisabled = (count: number) => count <= 1

export const commitOnEnter = (
  event: { key: string; preventDefault: () => void },
  commit: () => void
) => {
  if (event.key !== "Enter") return
  event.preventDefault()
  commit()
}

export const isRepository = (value: string) => /^[\w.-]+\/[\w.-]+$/.test(value.trim())

export const secretsSettingsUrl = (repository: string) =>
  `https://github.com/${repository.trim()}/settings/secrets/actions/new`

export const secretsHref = (repository: string) =>
  isRepository(repository) ? secretsSettingsUrl(repository) : undefined

export const formatPercent = (ratio: number) => `${Number((ratio * 100).toFixed(2))}%`

const stripTrailingSlash = (url: string) => url.trim().replace(/\/+$/, "")

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`

const formatRatio = (ratio: number) => String(Number(ratio.toFixed(6)))

export function buildWorkflow({ base, preview, routes, threshold, useApiKey }: WorkflowOptions) {
  const head = preview.kind === "vercel" ? "vercel" : stripTrailingSlash(preview.url)
  const routeList = routes.length > 0 ? routes : ["/"]

  const permissions = ["  pull-requests: write"]
  if (preview.kind === "vercel") permissions.push("  deployments: read")

  const inputs = [
    `          base: ${stripTrailingSlash(base)}`,
    `          head: ${head}`,
    "          routes: |",
    ...routeList.map((route) => `            - ${quote(route)}`),
  ]
  if (threshold !== DEFAULT_THRESHOLD) inputs.push(`          threshold: ${formatRatio(threshold)}`)
  if (useApiKey) inputs.push(`          microlink-api-key: \${{ secrets.${MICROLINK_SECRET} }}`)
  inputs.push(`          s3-config: \${{ secrets.${S3_SECRET} }}`)

  return [
    "name: Visual diff",
    "on:",
    "  pull_request:",
    "    types: [opened, synchronize, reopened, closed]",
    "",
    "permissions:",
    ...permissions,
    "",
    "jobs:",
    "  visual-diff:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: microlinkhq/difftool@master",
    "        with:",
    ...inputs,
    "",
  ].join("\n")
}

export interface InstallPromptOptions extends WorkflowOptions {
  provider: StorageProvider
  repository: string
  docsUrl: string
  dashboardUrl: string
}

const BUCKET_PERMISSIONS = "PutObject, GetObject, DeleteObject and ListBucket"
const FREE_TIER = "5 requests a day"
const FREE_KEY_TIER = "25 requests a day"
const COMMENT_TITLE = "@microlink/difftool visual comparison"

const providerLabel = (provider: StorageProvider) =>
  STORAGE_PROVIDERS.find((item) => item.id === provider)?.label ?? provider

const secretsPlace = (repository: string) =>
  isRepository(repository) ? secretsSettingsUrl(repository) : "Settings → Secrets and variables → Actions"

const secretSteps = ({ provider, repository, useApiKey, dashboardUrl }: InstallPromptOptions) => [
  `Never write secret values into a file or a commit. The workflow reads these repository secrets: ask me to add them at ${secretsPlace(repository)}, or, when the GitHub CLI is installed and signed in, run \`gh secret set <NAME>\` and let me paste the value.`,
  "",
  `- \`${S3_SECRET}\`: the ${providerLabel(provider)} bucket the screenshots are uploaded to, as JSON in this shape:`,
  "",
  "```json",
  storageConfig(provider),
  "```",
  "",
  `  Its access key only needs ${BUCKET_PERMISSIONS} on that one bucket.`,
  useApiKey
    ? `- \`${MICROLINK_SECRET}\`: a Microlink API key, from ${dashboardUrl}.`
    : `- No Microlink API key: screenshots use Microlink's free endpoint, ${FREE_TIER}. A free key from ${dashboardUrl} raises that to ${FREE_KEY_TIER}.`,
]

const numberedSteps = (steps: string[][]) =>
  steps.flatMap((lines, index) => [`${index + 1}. ${lines[0]}`, ...lines.slice(1), ""])

const vercelStep = [
  "The workflow uses `head: vercel`: it waits for the Vercel preview deployment of each pull request's head commit. Check that this repository deploys previews on Vercel. If it does not, tell me and ask for a fixed preview URL to use as `head` instead.",
]

const ABOUT_DIFFTOOL = (docsUrl: string) =>
  `difftool is a GitHub Action. On every pull request it screenshots production and the pull request's preview deploy with Microlink, compares them pixel by pixel, and keeps one comment on the pull request up to date with what changed. Docs: ${docsUrl}`

export function buildInstallPrompt(options: InstallPromptOptions) {
  const steps = [
    [`Create \`${WORKFLOW_PATH}\` with exactly this content:`, "", "```yaml", buildWorkflow(options).replace(/\n$/, ""), "```"],
    secretSteps(options),
    ...(options.preview.kind === "vercel" ? [vercelStep] : []),
    [
      `Commit the workflow on a new branch and open a pull request. Confirm the "Visual diff" check runs and, once the preview is ready, a github-actions comment titled "${COMMENT_TITLE}" appears.`,
    ],
  ]

  return [
    "Install microlink difftool in this repository.",
    "",
    ABOUT_DIFFTOOL(options.docsUrl),
    "",
    ...numberedSteps(steps),
    "Change nothing else in the repository.",
    "",
  ].join("\n")
}

export interface AgentPromptOptions {
  docsUrl: string
  dashboardUrl: string
  siteUrl: string
}

export const AGENT_PROMPT_BASE = "https://<production-domain>"

const AGENT_TEMPLATE_OPTIONS: WorkflowOptions = {
  base: AGENT_PROMPT_BASE,
  preview: { kind: "vercel" },
  routes: ["/"],
  threshold: DEFAULT_THRESHOLD,
  useApiKey: true,
}

const otherProviders = STORAGE_PROVIDERS.filter(({ id }) => id !== "r2")
  .map(({ label }) => label)
  .join(", ")

export function buildAgentPrompt({ docsUrl, dashboardUrl, siteUrl }: AgentPromptOptions) {
  const steps = [
    [
      "Find the production URL of the site this repository deploys. Look at the README, the `homepage` field in package.json, and deploy config such as vercel.json or netlify.toml. If you cannot tell for sure, ask me.",
    ],
    [
      "Find how pull requests get a preview deploy. If the repository deploys on Vercel (vercel.json, a `.vercel` directory, or Vercel bot comments on past pull requests), keep `head: vercel`: the action waits for the Vercel preview of each pull request's head commit. Otherwise ask me for the preview URL and use it as `head`, and drop `deployments: read` from the permissions.",
    ],
    [
      "Pick the routes to compare: `/` plus up to four of the most important pages you find in the router or the sitemap. Show me the list before going on.",
    ],
    [
      `Create \`${WORKFLOW_PATH}\` from this template, replacing \`${AGENT_PROMPT_BASE}\`, \`head\` and \`routes\` with what you found:`,
      "",
      "```yaml",
      buildWorkflow(AGENT_TEMPLATE_OPTIONS).replace(/\n$/, ""),
      "```",
    ],
    [
      "Never write secret values into a file or a commit. The workflow reads these repository secrets: ask me to add them in Settings → Secrets and variables → Actions, or, when the GitHub CLI is installed and signed in, run `gh secret set <NAME>` and let me paste the value.",
      "",
      `- \`${S3_SECRET}\`: an S3-compatible bucket the screenshots are uploaded to. Ask me which provider I use. Cloudflare R2 is recommended (free egress) and takes this shape:`,
      "",
      "```json",
      storageConfig("r2"),
      "```",
      "",
      `  ${otherProviders} also work with the same keys; the docs list each shape. The access key only needs ${BUCKET_PERMISSIONS} on that one bucket.`,
      `- \`${MICROLINK_SECRET}\`: optional. Without it screenshots use Microlink's free endpoint, ${FREE_TIER}. A free key from ${dashboardUrl} raises that to ${FREE_KEY_TIER}; if I have none, remove the \`microlink-api-key\` line.`,
    ],
    [
      `Commit the workflow on a new branch and open a pull request. Confirm the "Visual diff" check runs and, once the preview is ready, a github-actions comment titled "${COMMENT_TITLE}" appears.`,
    ],
  ]

  return [
    "Set up microlink difftool in this repository.",
    "",
    ABOUT_DIFFTOOL(docsUrl),
    "",
    `To compare two screenshots by hand, without the action, use the web app at ${siteUrl}.`,
    "",
    ...numberedSteps(steps),
    "Change nothing else in the repository.",
    "",
  ].join("\n")
}
