# microlink-difftool

Visual diff between two URLs using Microlink full-page screenshots. Built so PR previews can be eyeballed against production at a glance.

Two surfaces:

- **GitHub Action** — `microlinkhq/microlink-difftool@v1`. Posts a sticky PR comment with a diff table + screenshots. See [GitHub Action](#github-action) below.
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
  contents: write          # push screenshots to the assets branch
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
      - uses: actions/checkout@v4
      - uses: microlinkhq/microlink-difftool@v1
        with:
          base: https://unavatar.io
          head: ${{ steps.preview.outputs.url }}
          routes: '/,/kikobeats'
          threshold: '0.005'
          microlink-api-key: ${{ secrets.MICROLINK_API_KEY }}
```

### Cleanup workflow

`.github/workflows/microlink-difftool-cleanup.yml` — see [`examples/cleanup.yml`](./examples/cleanup.yml). Removes a PR's screenshots from the assets branch when the PR closes.

### How image hosting works

The action commits screenshots to an orphan branch in your repo (default: `microlink-difftool-assets`) under `pr-<number>/<sha>/<route>/` and references those `raw.githubusercontent.com` URLs in the PR comment. The orphan branch shares no history with `main`, so it doesn't pollute your code history. The cleanup workflow removes a PR's directory when the PR closes.

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `base` | *(required)* | Production / baseline URL |
| `head` | *(required)* | Preview URL to compare against |
| `routes` | `/` | Comma-separated paths to diff |
| `threshold` | `0.001` | Max acceptable diff ratio (0..1) |
| `pixel-threshold` | `0.1` | Per-pixel sensitivity (0..1) |
| `viewport-width` | `1280` | |
| `viewport-height` | `800` | |
| `microlink-api-key` | *(empty)* | Optional paid-tier key |
| `assets-branch` | `microlink-difftool-assets` | Orphan branch name |
| `comment-marker` | `<!-- microlink-difftool -->` | HTML marker for the sticky comment |
| `github-token` | `${{ github.token }}` | Token for pushing assets and commenting |

### Outputs

| Output | Description |
| --- | --- |
| `passed` | `"true"` if all routes within threshold |
| `summary-json` | Path to `summary.json` on the runner |
