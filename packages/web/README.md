# @microlink/difftool-web

The site at [difftool.microlink.io](https://difftool.microlink.io). One page, two jobs:

- **Landing.** Explains difftool and walks you through adding the GitHub Action to a repository. The setup wizard builds `.github/workflows/visual-diff.yml` and the `S3_CONFIG` secret from your answers.
- **Comparison tool.** Drop two images (or paste their URLs) in the hero to compare them in split, fade, slider, highlight, or subtract mode. Nothing is uploaded; the browser does the work.

The GitHub Action's PR comment links here with `?base=<url>&head=<url>`. When both are present the page skips the landing and opens the comparison directly. `?mode=` selects the starting mode.

Built with Next.js. Originally generated with [v0](https://v0.app); its history was imported from `Kikobeats/v0-image-comparison-tool`.

## Layout

```
app/                       page shell, fonts, design tokens (globals.css)
components/top-bar.tsx     the bar shared by the landing and the comparison view
components/landing/        hero, how it works, modes demo, setup wizard, FAQ, footer
components/comparison-*    the comparison tool
lib/workflow.ts            builds the workflow YAML and the S3 config the wizard shows
lib/pixel-diff.ts          the highlight and subtract algorithms
public/examples/           a real production/preview pair from unavatar.io used by "Try a real example"
```

## Development

From the repository root:

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build
```

Tests (no browser needed):

```bash
pnpm --filter @microlink/difftool-web test
```

`lib/workflow.test.mjs` pins the generated workflow to the one documented in the root README; change both together.

## Deploying

The Vercel project builds this directory: set **Root Directory** to `packages/web`.
