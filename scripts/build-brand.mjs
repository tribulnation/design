// Generates the downloadable brandkit assets served from /site/brand/.
// Source of truth is /assets (marks + lockups, all `currentColor` SVGs);
// this script derives fixed-color and dual-mode variants, PNG rasters, and
// a "download everything" zip from them. Nothing in /assets/ is modified —
// everything here is build output, regenerated on every deploy.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Resvg } from '@resvg/resvg-js'
import archiver from 'archiver'

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, '..', 'assets')
const outDir = join(here, '..', 'site', 'brand')

const INK = { black: '#0a0c10', white: '#f5f4f0' }
const PNG_WIDTHS = [512, 2048]

function svgParts(src) {
  const viewBox = src.match(/viewBox="([^"]+)"/)[1]
  const inner = src.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].trim()
  return { viewBox, inner }
}

/** Fixed-color transparent SVG (existing behavior: black.svg / white.svg).
 *  Each path carries its own `fill="currentColor"`, which resolves via the
 *  CSS `color` property (not an ancestor's `fill` attribute) — so this
 *  sets `color`, not `fill`, on the wrapping group. */
function buildFlatSvg(viewBox, inner, hex) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<g style="color:${hex}">
${inner}
</g>
</svg>
`
}

/** Single dual-mode SVG: opaque background, default light-bg/dark-ink,
 *  switches to dark-bg/light-ink under prefers-color-scheme. Paths keep
 *  their original `fill="currentColor"` — color comes from the `.ui-ink`
 *  ancestor's CSS `color`, which the media query overrides. PNG rasters
 *  render the default (unconditional) rule since rasterizers don't
 *  evaluate media queries. */
function buildBackgroundSvg(viewBox, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<style>
  .ui-bg { fill: ${INK.white}; }
  .ui-ink { color: ${INK.black}; }
  @media (prefers-color-scheme: dark) {
    .ui-bg { fill: ${INK.black}; }
    .ui-ink { color: ${INK.white}; }
  }
</style>
<rect class="ui-bg" x="0" y="0" width="100%" height="100%"/>
<g class="ui-ink">
${inner}
</g>
</svg>
`
}

function renderPngs(svg, outPathPrefix) {
  for (const width of PNG_WIDTHS) {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    const png = resvg.render().asPng()
    writeFileSync(`${outPathPrefix}@${width}.png`, png)
  }
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// ---- mark / lockup-horizontal / lockup-stacked: unchanged geometry ----
const STANDARD_VARIANTS = [
  { slug: 'mark', src: join(assetsDir, 'marks', 'brush.svg') },
  { slug: 'lockup-horizontal', src: join(assetsDir, 'lockups', 'brush-lockup-horizontal.svg') },
  { slug: 'lockup-stacked', src: join(assetsDir, 'lockups', 'brush-lockup-stacked.svg') }
]

for (const variant of STANDARD_VARIANTS) {
  const master = readFileSync(variant.src, 'utf8')
  if (!master.includes('currentColor')) {
    throw new Error(`${variant.src} has no currentColor fill to replace — check the source SVG.`)
  }
  const { viewBox, inner } = svgParts(master)
  const variantDir = join(outDir, variant.slug)
  mkdirSync(variantDir, { recursive: true })

  for (const [name, hex] of Object.entries(INK)) {
    const svg = buildFlatSvg(viewBox, inner, hex)
    writeFileSync(join(variantDir, `${name}.svg`), svg)
    renderPngs(svg, join(variantDir, name))
  }

  const bgSvg = buildBackgroundSvg(viewBox, inner)
  writeFileSync(join(variantDir, 'background.svg'), bgSvg)
  renderPngs(bgSvg, join(variantDir, 'background'))

  console.log(`built ${variant.slug}`)
}

// ---- icon: brush mark recentered/scaled to fit the maskable safe zone ----
// Safe zone follows the standard maskable-icon convention: a circle
// centered on the icon, radius = 40% of the icon's width. Computed once
// against assets/marks/brush.svg's actual ink extents (measured via
// Playwright: max distance from the mark's natural center (510, 480) is
// ~570.79 units, sampled along the real path outlines, not just the loose
// bounding-box corners) and hand-verified visually — not re-derived on
// every build, since the source mark doesn't change often and this avoids
// a headless-browser dependency in the generator.
{
  const ICON_SIZE = 1024
  const SAFE_RADIUS = 0.4 * ICON_SIZE // 409.6 — standard maskable safe zone
  const MARK_MAX_DIST = 570.7889277132134 // measured, see comment above
  const MARK_CENTER = { x: 510, y: 480 } // natural center of brush.svg's 1020x960 viewBox
  const scale = SAFE_RADIUS / MARK_MAX_DIST
  const tx = ICON_SIZE / 2 - scale * MARK_CENTER.x
  const ty = ICON_SIZE / 2 - scale * MARK_CENTER.y

  const master = readFileSync(join(assetsDir, 'marks', 'brush.svg'), 'utf8')
  const { inner } = svgParts(master)
  const fitted = `<g transform="translate(${tx},${ty}) scale(${scale})">\n${inner}\n</g>`

  const variantDir = join(outDir, 'icon')
  mkdirSync(variantDir, { recursive: true })

  const bgSvg = buildBackgroundSvg(`0 0 ${ICON_SIZE} ${ICON_SIZE}`, fitted)
  writeFileSync(join(variantDir, 'background.svg'), bgSvg)
  renderPngs(bgSvg, join(variantDir, 'background'))

  console.log('built icon')
}

// Zip everything just generated. Build it in a scratch location first —
// zipping outDir into a file that also lives inside outDir would have the
// archiver read its own half-written output.
const tmpZipPath = join(tmpdir(), `tribulnation-brandkit-${Date.now()}.zip`)
await new Promise((resolve, reject) => {
  const output = createWriteStream(tmpZipPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  output.on('close', resolve)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory(outDir, 'tribulnation-brandkit')
  archive.finalize()
})
renameSync(tmpZipPath, join(outDir, 'tribulnation-brandkit.zip'))

console.log('built tribulnation-brandkit.zip')
