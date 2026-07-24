// Copies the canonical mark SVGs from /assets/marks (repo root) into
// src/lib/marks so svelte-package ships a self-contained tarball — a
// package published to npm can't have its .svelte source files importing
// paths that reach outside the package (those wouldn't exist once someone
// installs from node_modules). /assets/marks is the single source of
// truth; this is the one place that's allowed to know that.
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', '..', 'assets', 'marks')
const dest = join(here, '..', 'src', 'lib', 'marks')

mkdirSync(dest, { recursive: true })

for (const name of ['brush.svg', 'geo.svg', 'signal.svg']) {
  copyFileSync(join(src, name), join(dest, name))
  console.log(`synced ${name}`)
}
