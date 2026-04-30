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

Drop these two workflows in your repo to get visual diffs as PR comments automatically.

### Required permissions

The PR workflow needs:

```yaml
permissions:
  contents: write          # create per-PR Release + tag to host screenshots
  pull-requests: write     # post / update the sticky comment
```

### Main workflow

`.github/workflows/microlink-difftool.yml` — see [`examples/workflow.yml`](./examples/workflow.yml).

```yaml
on: pull_request
permissions:
  contents: write
  pull-requests: write
jobs:
  visual-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: microlinkhq/difftool@master
        with:
          base: https://unavatar.io
          head: ${{ steps.preview.outputs.url }}
          routes: '/,/kikobeats'
          threshold: '0.005'
          pr-number: ${{ github.event.pull_request.number }}
          sha: ${{ github.event.pull_request.head.sha }}
          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}
```

### Cleanup workflow

`.github/workflows/microlink-difftool-cleanup.yml` — see [`examples/cleanup.yml`](./examples/cleanup.yml). Deletes the per-PR Release (and its tag) when the PR closes.

### How image hosting works

The action creates one **GitHub Release** per pull request, tagged `microlink-difftool-pr-<number>` and marked as a prerelease so it doesn't appear under "Latest release". Screenshots are uploaded as release assets named `<route-slug>-<file>.png` (e.g. `root-base.png`, `kikobeats-diff.png`).

The PR comment references those assets via their `browser_download_url` — release download URLs are served from a public CDN and **render even when the parent repository is private**, so reviewers see the screenshots inline regardless of repo visibility. No external CDN, no extra secrets.

Each workflow run replaces the prior assets in the same release; the cleanup workflow deletes the release entirely when the PR closes.

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `base` | *(required)* | Production / baseline URL |
| `head` | *(required)* | Preview URL to compare against |
| `pr-number` | *(required)* | Pull request number to comment on |
| `sha` | *(required)* | Commit SHA used in the assets path |
| `routes` | `/` | Comma-separated paths to diff |
| `threshold` | `0.001` | Max acceptable diff ratio (0..1) |
| `pixel-threshold` | `0.1` | Per-pixel sensitivity (0..1) |
| `viewport-width` | `1280` | |
| `viewport-height` | `800` | |
| `microlink-api-key` | *(empty)* | Optional paid-tier key |
| `release-tag-prefix` | `microlink-difftool-pr` | Prefix for the per-PR release tag (final tag: `<prefix>-<pr-number>`) |
| `comment-marker` | `<!-- microlink-difftool -->` | HTML marker for the sticky comment |
| `github-token` | `${{ github.token }}` | Token for uploading release assets and commenting |

### Outputs

| Output | Description |
| --- | --- |
| `passed` | `"true"` if all routes within threshold |
| `summary-json` | Path to `summary.json` on the runner |
