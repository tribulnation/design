# design

Design system for Tribulnation Labs.

## Layout

- **`/assets`** — canonical source files: the logo marks (`marks/`) and the
  wordmark lockups (`lockups/`). Single source of truth — everything else
  in this repo is generated from or synced from here, never the other way
  around.
- **`/site`** — deployed to [design.tribulnation.com](https://design.tribulnation.com/)
  via `.github/workflows/deploy.yml` and Cloudflare Workers.
  - `site/index.html` — the brandkit: download the mark and lockups as
    SVG/PNG, black or white.
  - `site/showcase/` — the interactive design-system tool (logo/palette/
    mode/font axes, all overridable via URL hash for QA — see its own
    inline comments for the state machine).
  - `site/brand/` — **generated**, not committed (see `.gitignore`). Built
    by `scripts/build-brand.mjs` from `/assets` on every Cloudflare deploy.
- **`/packages/ui`** — [`@tribulnation/ui`](https://www.npmjs.com/package/@tribulnation/ui),
  the npm package: Svelte components + CSS tokens + the hash-driven axis
  engine, for sites (like `tribulnation/landing`) to consume directly
  instead of reimplementing the design system inline. Published via
  `.github/workflows/publish-ui.yml` (npm Trusted Publishing — no stored
  token). See `packages/ui/README.md`.
- **`/scripts`** — `build-brand.mjs`, the brandkit generator. Run
  `npm install && npm run build:brand` inside `/scripts` to build
  `site/brand/` locally before previewing `/site`.

## Local preview

```sh
cd scripts && npm install && npm run build:brand && cd ..
python3 -m http.server 8000 --directory site
# → http://localhost:8000/          (brandkit)
# → http://localhost:8000/showcase/ (interactive tool)
```

## Deployment

Pull requests run a credential-free build and Wrangler dry run. Pushes to
`main` (or a manual workflow run on `main`) deploy only after that check
passes. The GitHub Actions `production` environment needs these secrets:

1. `CLOUDFLARE_API_TOKEN`: a Cloudflare API token authorized to deploy Workers
   and configure the `design.tribulnation.com` custom domain.
2. `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account that owns the Worker.

Create that environment under repository **Settings → Environments** and
restrict deployment branches to `main`. Configure the Cloudflare zone and
token before merging this workflow. Nothing is deployed from pull requests.
The GitHub environment name is separate from Wrangler environments; this
site uses the top-level Wrangler configuration for its one production Worker.

The deploy command builds the generated brandkit into `site/` and deploys
that directory to Cloudflare with Wrangler:

```sh
cd scripts
npm ci
npm run deploy
```

To validate the complete build and Cloudflare bundle without deploying:

```sh
cd scripts
npm run deploy -- --dry-run
```
