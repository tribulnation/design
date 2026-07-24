// Generates dist/favicon.svg from the canonical (tight, unpadded) brush
// mark — a single dual-mode SVG that switches ink color via an embedded
// prefers-color-scheme media query, transparent background. Favicons
// render small in chrome the browser already provides its own backdrop
// for, so the tight mark (not the padded maskable "icon" brandkit
// variant) is the right fit here. Consumers (e.g. tribulnation/landing)
// sync this file in at build time instead of hand-maintaining their own
// copy — see @tribulnation/ui's "./favicon.svg" export.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const markPath = join(here, '..', '..', '..', 'assets', 'marks', 'brush.svg')
const outPath = join(here, '..', 'dist', 'favicon.svg')

const master = readFileSync(markPath, 'utf8')
const viewBox = master.match(/viewBox="([^"]+)"/)[1]
const inner = master.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].trim()

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<style>
  .ui-ink { color: #14171c; }
  @media (prefers-color-scheme: dark) {
    .ui-ink { color: #f5f4f0; }
  }
</style>
<g class="ui-ink">
${inner}
</g>
</svg>
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, svg)
console.log('built dist/favicon.svg')
