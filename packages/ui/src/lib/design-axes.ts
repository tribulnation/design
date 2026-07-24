/**
 * Hash-driven design-system axis engine.
 *
 * A "config" describes a set of axes (e.g. `logo`, `palette`, `mode`, `font`)
 * each with a default value and a list of valid values. The current state is
 * read from `window.location.hash` (e.g. `#mode=light&palette=lime`), falls
 * back to the defaults for anything missing or invalid, and is applied to
 * `<html data-{axis}="{value}">` attributes for CSS to key off.
 *
 * One axis (typically `mode`) can additionally support a "system" value that
 * resolves live from something external (e.g. `prefers-color-scheme`) rather
 * than being a fixed CSS value.
 */

export type Axes = Record<string, string>

export type SystemResolver = {
  /** Name of the axis this resolver applies to, e.g. 'mode'. */
  axis: string
  /** The axis value that means "defer to the resolver", e.g. 'system'. */
  systemValue: string
  /** Returns the concrete value (e.g. 'dark' | 'light') right now. */
  resolve: () => string
  /** Subscribe to changes that should trigger a re-apply; returns an unsubscribe fn. */
  onChange: (cb: () => void) => () => void
}

export interface DesignAxesConfig {
  defaults: Axes
  validValues: Record<string, string[]>
  system?: SystemResolver
}

function parseHash(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

/** Read the current axis values from the URL hash, falling back to defaults. */
export function resolveAxes(config: DesignAxesConfig): Axes {
  const params = parseHash()
  const resolved: Axes = {}
  for (const key of Object.keys(config.defaults)) {
    const raw = params.get(key)
    const valid = config.validValues[key] ?? []
    resolved[key] = raw && valid.includes(raw) ? raw : config.defaults[key]
  }
  return resolved
}

/** Write `axes` onto `root` as `data-{axis}` attributes, resolving the system axis if present. */
export function applyAxes(axes: Axes, config: DesignAxesConfig, root: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(axes)) {
    const isSystem = config.system?.axis === key && value === config.system.systemValue
    root.setAttribute(`data-${key}`, isSystem ? config.system!.resolve() : value)
  }
}

/**
 * Start syncing `document.documentElement` with the hash (and the system
 * resolver, if configured). Calls `onChange` with the resolved axes on every
 * update, including immediately. Returns a cleanup function.
 */
export function watchAxes(config: DesignAxesConfig, onChange?: (axes: Axes) => void): () => void {
  const root = document.documentElement
  const apply = () => {
    const axes = resolveAxes(config)
    applyAxes(axes, config, root)
    onChange?.(axes)
  }
  apply()

  window.addEventListener('hashchange', apply)
  const cleanups = [() => window.removeEventListener('hashchange', apply)]
  if (config.system) cleanups.push(config.system.onChange(apply))

  return () => cleanups.forEach((fn) => fn())
}

/** Set a single axis value, preserving the others already present in the hash. */
export function setAxis(name: string, value: string): void {
  const params = parseHash()
  params.set(name, value)
  window.location.hash = params.toString()
}

/** Convenience: a `SystemResolver` for `mode` backed by `prefers-color-scheme`. */
export function prefersColorSchemeResolver(systemValue = 'system'): SystemResolver {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  return {
    axis: 'mode',
    systemValue,
    resolve: () => (media.matches ? 'dark' : 'light'),
    onChange: (cb) => {
      media.addEventListener('change', cb)
      return () => media.removeEventListener('change', cb)
    }
  }
}
