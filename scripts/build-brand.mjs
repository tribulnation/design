// Generates the downloadable brandkit assets served from /site/brand/.
// Source of truth is /assets (marks + lockups, all `currentColor` SVGs);
// this script derives fixed black/white color variants and PNG rasters
// from them, plus a "download everything" zip. Nothing in /assets/ is
// modified — everything here is build output, regenerated on every deploy.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Resvg } from '@resvg/resvg-js'
import archiver from 'archiver'
import { createWriteStream } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(here, '..', 'assets')
const outDir = join(here, '..', 'site', 'brand')

const COLORS = {
  black: '#0a0c10',
  white: '#f5f4f0'
}
const PNG_WIDTHS = [512, 2048]

const VARIANTS = [
  { slug: 'mark', src: join(assetsDir, 'marks', 'brush.svg') },
  { slug: 'lockup-horizontal', src: join(assetsDir, 'lockups', 'brush-lockup-horizontal.svg') },
  { slug: 'lockup-stacked', src: join(assetsDir, 'lockups', 'brush-lockup-stacked.svg') }
]

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const variant of VARIANTS) {
  const master = readFileSync(variant.src, 'utf8')
  if (!master.includes('currentColor')) {
    throw new Error(`${variant.src} has no currentColor fill to replace — check the source SVG.`)
  }

  const variantDir = join(outDir, variant.slug)
  mkdirSync(variantDir, { recursive: true })

  for (const [colorName, hex] of Object.entries(COLORS)) {
    const colored = master.replaceAll('currentColor', hex)
    const svgPath = join(variantDir, `${colorName}.svg`)
    writeFileSync(svgPath, colored)

    for (const width of PNG_WIDTHS) {
      const resvg = new Resvg(colored, { fitTo: { mode: 'width', value: width } })
      const png = resvg.render().asPng()
      writeFileSync(join(variantDir, `${colorName}@${width}.png`), png)
    }
  }

  console.log(`built ${variant.slug}`)
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
