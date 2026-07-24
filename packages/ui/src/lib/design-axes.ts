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
 *
 * Axes listed in `persist` remember the user's last explicit choice in
 * localStorage (e.g. a mode switch shouldn't clutter the URL) — the hash
 * still wins whenever it's present, so share/QA links (`#mode=light`) always
 * override, but everyday clicks on a switch don't rewrite the address bar.
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
  /** Axis names whose user-chosen value should persist in localStorage instead of the hash. */
  persist?: string[]
}

const STORAGE_KEY = 'tribulnation-ui:axes'
const LOCAL_CHANGE_EVENT = 'tribulnation-ui:axes-change'

function parseHash(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ''))
}

function readPersisted(): Axes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writePersisted(name: string, value: string): void {
  try {
    const current = readPersisted()
    current[name] = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    // localStorage's own 'storage' event only fires in *other* tabs — dispatch
    // one ourselves so same-tab listeners (watchAxes) pick up the change too.
    window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT))
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) — the
    // value just won't persist across reloads; not worth failing over.
  }
}

/**
 * Read the current axis values: the hash wins when present and valid, then
 * (for `persist`-listed axes) the last localStorage value, then the default.
 */
export function resolveAxes(config: DesignAxesConfig): Axes {
  const params = parseHash()
  const persisted = config.persist?.length ? readPersisted() : {}
  const resolved: Axes = {}
  for (const key of Object.keys(config.defaults)) {
    const raw = params.get(key)
    const valid = config.validValues[key] ?? []
    if (raw && valid.includes(raw)) {
      resolved[key] = raw
    } else if (config.persist?.includes(key) && persisted[key] && valid.includes(persisted[key])) {
      resolved[key] = persisted[key]
    } else {
      resolved[key] = config.defaults[key]
    }
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
 * Start syncing `document.documentElement` with the hash, localStorage (for
 * `persist`-listed axes), and the system resolver, if configured. Calls
 * `onChange` with the resolved axes on every update, including immediately.
 * Returns a cleanup function.
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
  if (config.persist?.length) {
    window.addEventListener(LOCAL_CHANGE_EVENT, apply)
    window.addEventListener('storage', apply) // cross-tab sync
    cleanups.push(() => window.removeEventListener(LOCAL_CHANGE_EVENT, apply))
    cleanups.push(() => window.removeEventListener('storage', apply))
  }

  return () => cleanups.forEach((fn) => fn())
}

/** Set a single axis value in the URL hash, preserving the others already there. */
export function setAxis(name: string, value: string): void {
  const params = parseHash()
  params.set(name, value)
  window.location.hash = params.toString()
}

/**
 * Set a single axis value in localStorage instead of the hash — use this for
 * axes listed in a `DesignAxesConfig`'s `persist` (e.g. a mode switch), so
 * user clicks don't rewrite the address bar. The hash still overrides
 * whenever present (see `resolveAxes`).
 */
export function setPersistedAxis(name: string, value: string): void {
  writePersisted(name, value)
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
