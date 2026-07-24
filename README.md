# design

Design system for Tribulnation Labs.

## Layout

- **`/assets`** — canonical source files: the logo marks (`marks/`) and the
  wordmark lockups (`lockups/`). Single source of truth — everything else
  in this repo is generated from or synced from here, never the other way
  around.
- **`/site`** — deployed to [tribulnation.github.io/design](https://tribulnation.github.io/design/)
  via `.github/workflows/pages.yml`.
  - `site/index.html` — the brandkit: download the mark and lockups as
    SVG/PNG, black or white.
  - `site/showcase/` — the interactive design-system tool (logo/palette/
    mode/font axes, all overridable via URL hash for QA — see its own
    inline comments for the state machine).
  - `site/brand/` — **generated**, not committed (see `.gitignore`). Built
    by `scripts/build-brand.mjs` from `/assets` on every Pages deploy.
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
