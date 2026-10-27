# @microlink/difftool-web

The comparison app at [difftool.microlink.io](https://difftool.microlink.io). It compares two images side by side, as a slider, or as a pixel diff. The GitHub Action's PR comment links here with the two screenshots as query parameters.

Built with Next.js. Originally generated with [v0](https://v0.app); its history was imported from `Kikobeats/v0-image-comparison-tool`.

## Development

From the repository root:

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build
```

## Deploying

The Vercel project builds this directory: set **Root Directory** to `packages/web`.
