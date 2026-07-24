<script lang="ts">
  /**
   * Renders all three marks and lets `marks.css` show only the one matching
   * `<html data-logo="...">`, set by the logo axis. This (rather than an
   * `if`/`else` in JS) keeps the mark in sync with the axis with zero JS on
   * the render path — the same trick used for the mode/font/palette axes.
   */
  import BrushMark from './BrushMark.svelte'
  import GeoMark from './GeoMark.svelte'
  import SignalMark from './SignalMark.svelte'

  interface Props {
    class?: string
  }

  let { class: className = '' }: Props = $props()
</script>

<span class="ui-logo {className}" aria-hidden="true">
  <GeoMark />
  <BrushMark />
  <SignalMark />
</span>

<style>
  .ui-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    box-sizing: border-box;
  }

  .ui-logo :global(svg) {
    width: auto;
    height: 100%;
    max-width: 100%;
    display: block;
  }
</style>
