/**
 * Theme preference: the storage boundary, its validation, and the single DOM write.
 *
 * `localStorage` on this origin is readable and writable by any script that runs here, so two rules
 * hold this module together. Nothing sensitive is stored — the only key is a theme name. And every
 * value read back out is untrusted input, so it passes through `parseTheme`, a strict equality
 * allowlist, before it can become a `Theme`. A tampered, stale or foreign value is not an error; it
 * will read as "no preference" and the app falls back to the OS setting.
 *
 */

export type Theme = 'light' | 'dark';

/**
 * Namespaced, to prevent key collision across sites
 */
export const STORAGE_KEY = 'd3-react:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const THEME_ATTRIBUTE = 'data-theme';

/**
 * To guard against hostile values in `localStorage`, the only way a string can become a `Theme` is to
 * pass through this strict validation function.
 */
function parseTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * The pinned preference, or `null` to follow the OS.
 */
export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persists a pinned preference */
export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable or over quota. The choice still applies to this page; it just will not
    // survive a refresh, which is a better outcome than failing the click.
  }
}

/** The current OS preference. Falls back to light where `matchMedia` is absent, as in jsdom. */
export function systemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Subscribes to OS theme changes, so an app that has not been pinned follows a switch made
 * mid-session. Returns a cleanup, and is an inert no-op where `matchMedia` is absent.
 */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const query = window.matchMedia(DARK_QUERY);
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');

  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
}

/**
 * Writes the preference to the root element, where `styles/tokens.css` picks it up. `null` removes
 * the attribute so the `prefers-color-scheme` media query resumes control.
 */
export function applyTheme(preference: Theme | null): void {
  const root = document.documentElement;
  if (preference === null) {
    root.removeAttribute(THEME_ATTRIBUTE);
    return;
  }
  root.setAttribute(THEME_ATTRIBUTE, preference);
}

/**
 * Called once from the entry point, before React renders. The body holds nothing but an empty root
 * element until the bundle runs, so setting the attribute here lands it ahead of first paint and
 * there is no flash of the wrong theme
 */
export function applyStoredTheme(): void {
  applyTheme(readStoredTheme());
}
