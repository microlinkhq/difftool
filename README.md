# microlink-difftool

Visual diff between two URLs using Microlink full-page screenshots. Built so PR previews can be eyeballed against production at a glance.

Two surfaces:

- **GitHub Action** — `microlinkhq/difftool@master`. Posts a sticky PR comment with a diff table + screenshots. See [GitHub Action](#github-action) below.
- **Local CLI** — clone this repo and run `./bin/cli.js`. Useful for ad-hoc checks and for debugging the action.

## Local usage

```bash
microlink-difftool \
  --base https://unavatar.io/ \
  --head https://unavatar-www-git-dependabot-npmandyarntailwindcss-424-microlink.vercel.app/ \
  --out ./diff-output
```

The primary deliverable is `diff-output/review.png` — a labeled, three-column composite (production, preview, diff) ready to attach to a PR comment.

## Multiple routes

By default `microlink-difftool` screenshots `/`. Pass `--routes` (repeatable or comma-separated) to diff several paths in one run:

```bash
microlink-difftool \
  --base https://unavatar.io \
  --head https://unavatar-…vercel.app \
  --routes / \
  --routes /kikobeats \
  --routes /github/kikobeats
```

…or:

```bash
microlink-difftool --base … --head … --routes /,/kikobeats,/github/kikobeats
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

jobs:
  visual-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: microlinkhq/difftool@master
        with:
          base: https://unavatar.io
          head: vercel
          routes: '/'
          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}
          s3-config: ${{ secrets.S3_CONFIG }}
```

That's it. No checkout, no separate cleanup workflow, no pre-step to discover the preview URL. You do need to set up an S3-compatible bucket — see [S3 storage setup](#s3-storage-setup) below.

### `head: vercel`

Pass `head: vercel` and the action waits for the Vercel deployment associated with the PR's head SHA to be ready, then uses its preview URL. Tune the polling with `provider-timeout` (seconds, default `600`) and `provider-interval` (seconds, default `10`). For other providers — or to bypass auto-discovery entirely — pass an explicit URL.

### S3 storage setup

The action uploads screenshots to an **S3-compatible object store** that you control, then references them via pre-signed URLs in the PR comment. This works for public *and* private repos, and any provider speaking the S3 API: Cloudflare R2 (recommended — free egress), AWS S3, Backblaze B2, MinIO, DigitalOcean Spaces, etc.

Steps:

1. Create a bucket on your provider of choice.
2. Create an API token scoped to **PutObject / GetObject / DeleteObject / ListBucket** on that bucket only.
3. Store the JSON config below as a repo secret named `S3_CONFIG`.

Required keys: `accessKeyId`, `secretAccessKey`, `bucket`. Other keys are provider-dependent.

#### Cloudflare R2 (recommended)

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

#### AWS S3

```json
{
  "region": "us-east-1",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "bucket": "difftool-assets"
}
```

#### Backblaze B2

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

#### MinIO / DigitalOcean Spaces / other

Use the provider's S3 endpoint URL, set `forcePathStyle: true` for MinIO, and use the provider's regions. Same JSON shape.

### How image hosting works

Screenshots are uploaded under `<owner>/<repo>/pr-<number>/<sha>/<route-slug>-<file>.png` (e.g. `microlinkhq/unavatar-www/pr-106/abc123/root-base.png`). The PR comment links to **pre-signed GetObject URLs** — your bucket stays private, the URLs work for anyone viewing the PR, and they expire after `presigned-ttl-seconds` (default 24h).

The comment is regenerated on every workflow run, so reviewers always see fresh URLs. When the PR closes (`pull_request: closed`), the action deletes everything under `pr-<number>/` from your bucket.

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `base` | *(required)* | Production / baseline URL |
| `head` | *(required)* | Preview URL, or `vercel` to auto-discover |
| `s3-config` | *(required)* | JSON config for an S3-compatible bucket (see above) |
| `pr-number` | *(event)* | PR number; defaults to the current `pull_request` event |
| `sha` | *(event)* | Commit SHA; defaults to `github.event.pull_request.head.sha` |
| `routes` | `/` | Comma-separated paths to diff |
| `threshold` | `0.001` | Max acceptable diff ratio (0..1) |
| `pixel-threshold` | `0.1` | Per-pixel sensitivity (0..1) |
| `viewport-width` | `1280` | |
| `viewport-height` | `800` | |
| `microlink-api-key` | *(empty)* | Optional paid-tier key |
| `presigned-ttl-seconds` | `86400` | Pre-signed URL TTL (overrides `s3-config.presignedTtlSeconds`) |
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
