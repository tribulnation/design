// Generates the full brandkit (mark/icon/lockups/social + zip) straight
// into dist/brandkit, by invoking the repo-root generator
// (scripts/build-brand.mjs) with a redirected output dir. This ships the
// brandkit as part of @tribulnation/ui itself, so consumers (e.g.
// tribulnation/landing) can sync it in via a normal npm version bump
// instead of a manual file copy — see scripts/sync-brand.mjs over there.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const rootBuildScript = join(here, '..', '..', '..', 'scripts', 'build-brand.mjs')

execFileSync(process.execPath, [rootBuildScript, 'dist/brandkit'], {
  cwd: join(here, '..'),
  stdio: 'inherit'
})
