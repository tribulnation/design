# @tribulnation/ui

Shared design system for Tribulnation Labs sites: CSS tokens for the
light/dark/system + brand (logo/palette/font) axes, the hash-driven state
engine behind them, the mode switch, logo marks, and font loading.

Source of truth: the interactive showcase at
[tribulnation.github.io/design](https://tribulnation.github.io/design/).
First integrated into [tribulnation/landing](https://github.com/tribulnation/landing).

## Install

```sh
npm install @tribulnation/ui
```

## Usage

```css
/* app.css or similar, imported once */
@import '@tribulnation/ui/tokens.css';
@import '@tribulnation/ui/marks.css';
```

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import {
    watchAxes,
    setAxis,
    prefersColorSchemeResolver,
    ModeSwitch,
    FontLinks,
    Logo,
    type Axes
  } from '@tribulnation/ui'

  const config = {
    defaults: { logo: 'brush', palette: 'coral', mode: 'system', font: 'marker', 'logo-outline': 'none' },
    validValues: {
      logo: ['geo', 'brush', 'signal'],
      palette: ['coral', 'lime'],
      mode: ['dark', 'light', 'system'],
      font: ['system', 'inter', 'orbitron', 'audiowide', 'marker', 'sriracha'],
      'logo-outline': ['none', 'circle', 'square']
    }
  }

  let axes: Axes = $state({ ...config.defaults })

  onMount(() => {
    const system = prefersColorSchemeResolver()
    return watchAxes({ ...config, system }, (resolved) => (axes = resolved))
  })
</script>

<FontLinks />

<Logo class="brand-logo" />

<ModeSwitch value={axes.mode as any} onchange={(v) => setAxis('mode', v)} />
```

Every axis is overridable via the URL hash for QA (e.g.
`#logo=geo&palette=lime&font=orbitron`) — the switch UI just calls `setAxis`
under the hood, so hand-editing the hash and clicking the switch both flow
through the same state.

## What's in here, and what isn't

Included: design tokens, the axis-sync engine, the mode switch, logo marks,
and font loading — the parts that are genuinely the same shape across sites.

Deliberately left out: page layout, nav/footer chrome, buttons, cards — those
vary per site and would just bake one site's copy/structure into a "shared"
package prematurely. Extract further only once a second real consumer shows
what's actually reusable there.

## Publishing

Bump `version` in `packages/ui/package.json` and push to `main`.
`.github/workflows/publish-ui.yml` builds the package and publishes to npm
whenever that version isn't already on the registry — no tagging step
needed. Requires an `NPM_TOKEN` repo secret (an npm automation token with
publish rights on the `@tribulnation` scope).
