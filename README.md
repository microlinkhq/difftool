# microlink-difftool

Visual diff between two URLs using Microlink full-page screenshots. Built so PR previews can be eyeballed against production at a glance.

Three surfaces:

- **GitHub Action** — `microlinkhq/difftool@master`. Posts a sticky PR comment with a diff table + screenshots. See [GitHub Action](#github-action) below.
- **Local CLI** — [`packages/cli`](packages/cli). Useful for ad-hoc checks and for debugging the action.
- **Web** — [`packages/web`](packages/web), deployed at [difftool.microlink.io](https://difftool.microlink.io). Compares two images side by side, as a slider, or as a diff. The PR comment's **compare** links open here.

## Repository layout

A pnpm workspace:

```
action.yml        the GitHub Action (stays at the root so `uses: microlinkhq/difftool@master` resolves)
packages/cli      @microlink/difftool: CLI and the code the action runs
packages/web      @microlink/difftool-web: Next.js comparison app
```

```bash
pnpm install
pnpm cli --help   # run the CLI
pnpm dev          # run the web app on http://localhost:3000
```

The action installs only `packages/cli` (`pnpm install --filter @microlink/difftool`), so the web app's dependencies never reach CI runners.

## Local usage

```bash
microlink-difftool \
  --base https://unavatar.io/ \
  --head https://unavatar-www-git-dependabot-npmandyarntailwindcss-424-microlink.vercel.app/ \
  --out ./diff-output
```

The primary deliverable is `diff-output/review.png` — a labeled, three-column composite (production, preview, diff) ready to attach to a PR comment.

## Multiple routes

By default `microlink-difftool` screenshots `/`. Pass `--routes` as a JSON array (or repeat the flag) to diff several paths in one run:

```bash
microlink-difftool \
  --base https://unavatar.io \
  --head https://unavatar-…vercel.app \
  --routes / \
  --routes /kikobeats \
  --routes /github/kikobeats
```

Each route gets its own subdirectory under `--out` (e.g. `diff-output/root/`, `diff-output/kikobeats/`, …) with `review.png`, `base.png`, `head.png`, and `diff.png`. A top-level `diff-output/summary.json` aggregates results.

The CLI exits non-zero if **any** route exceeds the threshold.

## Threshold

The CLI's job is to answer: **did this PR visually break the deployment?** The threshold is the lever.

```bash
microlink-difftool --base <url> --head <url> --threshold 0.02   # tolerate up to 2% changed pixels
```

Resolution order (first match wins):

1. `--threshold <ratio>`
2. `MICROLINK_DIFF_THRESHOLD` env var
3. `microlink-difftool.json` in the working directory: `{ "threshold": 0.02 }`
4. Default: `0.001` (0.1%)

For per-pixel sensitivity (color shift tolerance), use `--pixel-threshold <0..1>` (default `0.1`).

Exit code: `0` if `diffRatio ≤ threshold`, `1` otherwise.

## Auth

Set `MICROLINK_API_KEY` to use a paid plan; otherwise the free tier applies.

## GitHub Action

One workflow file. The action handles PR-time diff runs and PR-close cleanup internally.

```yaml
# .github/workflows/visual-diff.yml
name: Visual diff
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  pull-requests: write  # post / update sticky comment
  deployments: read     # poll Vercel deployment status when head=vercel

concurrency:
  group: visual-diff-${{ github.event.pull_request.number }}
  cancel-in-progress: ${{ github.event.action != 'closed' }}  # a new push cancels the old diff; closing waits for it, so cleanup runs last

jobs:
  visual-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: microlinkhq/difftool@master
        with:
          base: https://unavatar.io
          head: vercel
          routes: |
            - '/'
          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}
          s3-config: ${{ secrets.S3_CONFIG }}
```

That's it. No checkout, no separate cleanup workflow, no pre-step to discover the preview URL. You do need a bucket for the screenshots: an S3-compatible one, Upstash Blob or Vercel Blob, see [Storage setup](#storage-setup) below.

### `head: vercel`

Pass `head: vercel` and the action waits for the Vercel deployment associated with the PR's head SHA to be ready, then uses its preview URL. Tune the polling with `provider-timeout` (seconds, default `600`) and `provider-interval` (seconds, default `10`). For other providers — or to bypass auto-discovery entirely — pass an explicit URL.

### Storage setup

The action uploads screenshots to a bucket you control: an [S3-compatible object store](#s3-storage-setup) through `s3-config`, [Upstash Blob](#upstash-blob) through `upstash-blob-token`, or [Vercel Blob](#vercel-blob) through `vercel-blob-token`. Set exactly one of them.

<a id="s3-storage-setup"></a>

#### S3-compatible storage

The PR comment references the screenshots via pre-signed URLs. This works for public *and* private repos, and any provider speaking the S3 API: Cloudflare R2 (recommended — free egress), AWS S3, Backblaze B2, DigitalOcean Spaces, etc.

Steps:

1. Create a bucket on your provider of choice.
2. Create an API token scoped to **PutObject / GetObject / DeleteObject / ListBucket** on that bucket only.
3. Store the JSON config below as a repo secret named `S3_CONFIG`.

Required keys: `accessKeyId`, `secretAccessKey`, `bucket`. Other keys are provider-dependent.

##### Cloudflare R2 (recommended)

```json
{
  "endpoint": "https://<account-id>.r2.cloudflarestorage.com",
  "region": "auto",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "bucket": "difftool-assets",
  "forcePathStyle": true
}
```

##### AWS S3

```json
{
  "region": "us-east-1",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "bucket": "difftool-assets"
}
```

##### Backblaze B2

```json
{
  "endpoint": "https://s3.us-east-005.backblazeb2.com",
  "region": "us-east-005",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "bucket": "difftool-assets",
  "forcePathStyle": true
}
```

##### DigitalOcean Spaces / other

Use the provider's S3 endpoint URL and regions, and set `forcePathStyle: true` if it needs path-style addressing. Same JSON shape.

#### Upstash Blob

1. Create a bucket in the [Upstash console](https://console.upstash.com) and set it to **public**.
2. Store its token as a repo secret named `UPSTASH_BLOB_TOKEN`.
3. Pass it instead of `s3-config`:

```yaml
      - uses: microlinkhq/difftool@master
        with:
          base: https://unavatar.io
          head: vercel
          upstash-blob-token: ${{ secrets.UPSTASH_BLOB_TOKEN }}
```

The bucket has to be public because Upstash signs read links for 10 minutes at most, too short for a PR comment people open hours later. To keep public links unguessable, every run uploads under a random path (`<owner>/<repo>/pr-<number>/<sha>/<uuid>/<route-slug>-<file>.png`), and the links stay valid until the PR closes and its prefix is deleted. Screenshots are cached for an hour, so a copy already fetched can outlive the deletion by up to that long. Each run writes a fresh set of screenshots rather than overwriting the last one; they all go when the PR closes. `presigned-ttl-seconds` does not apply.

#### Vercel Blob

1. In the Vercel dashboard, open **Storage → Create → Blob** and set access to **Private**.
2. Store the store's read-write token as a repo secret named `BLOB_READ_WRITE_TOKEN`.
3. Pass it instead of `s3-config`:

```yaml
      - uses: microlinkhq/difftool@master
        with:
          base: https://unavatar.io
          head: vercel
          vercel-blob-token: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
```

It works like S3: screenshots go under `<owner>/<repo>/pr-<number>/<sha>/<route-slug>-<file>.png` in your private store, and the comment links to [presigned URLs](https://vercel.com/docs/vercel-blob/vercel-signed-urls) that expire after `presigned-ttl-seconds` (default 24h, at most 7 days, Vercel's limit) and are refreshed on every run. A public store is refused with a hint to create a private one. When the PR closes, everything under `pr-<number>/` is deleted.

### How image hosting works

With S3-compatible storage, screenshots are uploaded under `<owner>/<repo>/pr-<number>/<sha>/<route-slug>-<file>.png` (e.g. `microlinkhq/unavatar-www/pr-106/abc123/root-base.png`). The PR comment links to **pre-signed GetObject URLs** — your bucket stays private, the URLs work for anyone viewing the PR, and they expire after `presigned-ttl-seconds` (default 24h).

The comment is regenerated on every workflow run, so reviewers always see fresh URLs. When the PR closes (`pull_request: closed`), the action deletes everything under `pr-<number>/` from your bucket.

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `base` | *(required)* | Production / baseline URL |
| `head` | *(required)* | Preview URL, or `vercel` to auto-discover |
| `s3-config` | *(empty)* | JSON config for an S3-compatible bucket (see above). Set this, `upstash-blob-token` or `vercel-blob-token` |
| `upstash-blob-token` | *(empty)* | Token of a public [Upstash Blob](#upstash-blob) bucket. Set this, `s3-config` or `vercel-blob-token` |
| `vercel-blob-token` | *(empty)* | Read-write token of a private [Vercel Blob](#vercel-blob) store. Set this, `s3-config` or `upstash-blob-token` |
| `pr-number` | *(event)* | PR number; defaults to the current `pull_request` event |
| `sha` | *(event)* | Commit SHA; defaults to `github.event.pull_request.head.sha` |
| `routes` | `["/"]` | Array of paths to diff (JSON array string or YAML list string with `|`) |
| `threshold` | `0.001` | Max acceptable diff ratio (0..1) |
| `pixel-threshold` | `0.1` | Per-pixel sensitivity (0..1) |
| `mql` | `{ "force": true }` | JSON object with Microlink API options (`viewport`, `styles`, headers, etc.) |
| `microlink-api-key` | *(empty)* | Optional paid-tier key |
| `presigned-ttl-seconds` | `86400` | Pre-signed URL TTL (overrides `s3-config.presignedTtlSeconds`; Vercel Blob caps it at 7 days; Upstash Blob ignores it) |
| `provider-timeout` | `600` | Max seconds to wait for `head: vercel` discovery |
| `provider-interval` | `10` | Seconds between deployment-status polls |
| `comment-marker` | `<!-- microlink-difftool -->` | HTML marker for the sticky comment |
| `token` | *(empty)* | Token for the action; falls back to `github-token` |
| `github-token` | `${{ github.token }}` | Default token |

### Outputs

| Output | Description |
| --- | --- |
| `passed` | `"true"` if all routes within threshold |
| `summary-json` | Path to `summary.json` on the runner |
