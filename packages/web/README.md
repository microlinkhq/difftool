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
lib/metadata.ts            title, description, manifest and JSON-LD, shared by app/layout.tsx and app/page.tsx
public/examples/           a real production/preview pair from unavatar.io used by "Try a real example"
scripts/build-examples.mjs rebuilds public/examples from one difftool run
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

## Icons

`app/icon.svg` (the Microlink mark) is the source for every other icon. After changing it, regenerate the rest:

```bash
packages/web/scripts/generate-icons.sh   # from the repository root; needs rsvg-convert and ImageMagick: brew install librsvg imagemagick
```

It writes `app/favicon.ico` (16, 32, 48px), `app/apple-icon.png` (180px) and `public/icon-{192,512}.png` for the web manifest. The output is the same on every run, so a diff shows only real changes. `lib/metadata.test.mjs` fails if an icon goes missing or its size stops matching the manifest.

## Example images

`public/examples/` comes from one real run of the GitHub Action ([unavatar-www#192](https://github.com/microlinkhq/unavatar-www/pull/192)). `production.webp` and `preview.webp` feed "Try a real example"; `diff.webp`, `highlight.webp` and `review.webp` illustrate "How it works".

To swap in another run, point the script at either:

- **A local CLI run:** its `--out` folder, as is. The CLI writes `summary.json` there, with the images in the same folder for a single route, or in `<out>/<outDir>/` for several.
- **A PR comment:** a folder holding `summary.json` (the configuration block at the bottom of the comment; pasting it with its `<pre><code>` tags is fine) and `<slug>-base.png`, `<slug>-head.png`, `<slug>-diff.png` from the route's Production, Preview and Difference "open" links. `<slug>` is `root` for `/` and for a single-route run, otherwise the route's `outDir`. The links are presigned for 24 hours and the files are deleted when the PR closes, so download them while the PR is open.

Then, from the repository root, with `pnpm install` done (it brings `canvas` for the CLI) and ImageMagick on the path:

```bash
node packages/web/scripts/build-examples.mjs <folder> [route] [left,top,width]
```

`route` defaults to `/`. `left,top,width` frames `highlight.webp`, in pixels of the 1440px-wide preview; the default `317,84,805` fits the unavatar.io hero, so pass your own for any other page. The script crops every image from the same screenshots, runs the highlight with `lib/pixel-diff.ts` and the review with the CLI's `composite.js`, so the images match what the site and the action render. Last, update the numbers, captions and alt text in `components/landing/how-it-works.tsx` and the intro in `components/landing/modes-demo.tsx` to describe the new run.

## Deploying

The Vercel project builds this directory: set **Root Directory** to `packages/web`.
