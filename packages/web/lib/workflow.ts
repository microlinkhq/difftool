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

export const addRouteDisabled = (draft: string) => normalizeRoute(draft) === ""

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
