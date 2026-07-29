/**
 * Theme preference: the storage boundary, its validation, and the single DOM write.
 *
 * `localStorage` on this origin is readable and writable by any script that runs here, so two rules
 * hold this module together. Nothing sensitive is stored — the only key is a theme name. And every
 * value read back out is untrusted input, so it passes through `parseTheme`, a strict equality
 * allowlist, before it can become a `Theme`. A tampered, stale or foreign value is not an error; it
 * simply reads as "no preference" and the app falls back to the OS setting.
 *
 * The validated value reaches the page only through `setAttribute`, which performs no HTML or CSS
 * parsing. There is deliberately no `innerHTML`, no injected `<style>`, no interpolated selector and
 * no `eval` anywhere in this file — those are the sinks that would turn a poisoned storage entry
 * into something that executes.
 */

export type Theme = 'light' | 'dark';

/**
 * Namespaced, because a bare `theme` key collides with anything else deployed to the same origin —
 * a `*.github.io` account, say, where a neighbouring app could otherwise read or clobber it.
 */
export const STORAGE_KEY = 'd3-react:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const THEME_ATTRIBUTE = 'data-theme';

/**
 * The allowlist, and the only place an arbitrary string is allowed to become a `Theme`. Exact
 * equality against the two literals — no regex, no trimming, no case folding, no cast.
 */
function parseTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * The pinned preference, or `null` to follow the OS. Never throws: reading `window.localStorage` is
 * itself a `SecurityError` under Safari private browsing and in partitioned iframes, so the access
 * sits inside the `try` alongside the read.
 */
export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persists a pinned preference. Only ever writes one of the two literals. Never throws. */
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
 * the attribute so the `prefers-color-scheme` media query resumes control. Idempotent.
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
 * there is no flash of the wrong theme — without the inline `<head>` script that trick usually
 * needs, which would force `unsafe-inline` into any future CSP.
 */
export function applyStoredTheme(): void {
  applyTheme(readStoredTheme());
}
