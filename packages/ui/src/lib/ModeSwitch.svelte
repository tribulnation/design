<script lang="ts">
  export type ModeValue = 'light' | 'dark' | 'system'

  interface Props {
    /** Currently active value. */
    value: ModeValue
    /** Called with the newly picked value; wire this to `setAxis('mode', value)`. */
    onchange: (value: ModeValue) => void
    /** 'icon' (compact, for a nav bar) or 'labeled' (wider, for a mobile drawer). */
    variant?: 'icon' | 'labeled'
    class?: string
  }

  let { value, onchange, variant = 'icon', class: className = '' }: Props = $props()

  const options: { value: ModeValue; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ]
</script>

<div class="ui-mode-switch ui-mode-switch--{variant} {className}" role="group" aria-label="Color mode">
  {#each options as opt (opt.value)}
    <button
      type="button"
      class:active={value === opt.value}
      aria-pressed={value === opt.value}
      aria-label="{opt.label} mode"
      onclick={() => onchange(opt.value)}
    >
      {#if opt.value === 'light'}
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 0.75V2.5M8 13.5V15.25M15.25 8H13.5M2.5 8H0.75M13.03 2.97L11.78 4.22M4.22 11.78L2.97 13.03M13.03 13.03L11.78 11.78M4.22 4.22L2.97 2.97" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      {:else if opt.value === 'dark'}
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 9.7A6.25 6.25 0 1 1 6.3 1.5a5 5 0 0 0 8.2 8.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      {:else}
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2.5" width="14" height="9" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 14H10.5M8 11.5V14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      {/if}
      {#if variant === 'labeled'}<span>{opt.label}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .ui-mode-switch {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--surface);
  }

  .ui-mode-switch button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--muted-2);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .ui-mode-switch button svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  .ui-mode-switch button:hover {
    color: var(--text);
  }

  .ui-mode-switch button.active {
    background: var(--surface-2);
    color: var(--text);
  }

  .ui-mode-switch--labeled {
    display: flex;
  }

  .ui-mode-switch--labeled button {
    width: auto;
    height: 36px;
    flex: 1;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
  }
</style>
