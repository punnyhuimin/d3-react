import type { Theme } from '@/lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

type ChangeListener = (event: MediaQueryListEvent) => void;

let prefersDark = false;
const listeners = new Set<ChangeListener>();

/**
 * The listener set is shared across every `MediaQueryList` this returns. The app only ever asks for
 * the one query, so a per-instance registry would buy nothing but the bookkeeping to maintain it.
 */
function createMediaQueryList(query: string): MediaQueryList {
  const list = {
    media: query,
    onchange: null,
    get matches() {
      return query === DARK_QUERY && prefersDark;
    },
    addEventListener(type: string, listener: ChangeListener) {
      if (type === 'change') {
        listeners.add(listener);
      }
    },
    removeEventListener(type: string, listener: ChangeListener) {
      if (type === 'change') {
        listeners.delete(listener);
      }
    },
    addListener(listener: ChangeListener) {
      listeners.add(listener);
    },
    removeListener(listener: ChangeListener) {
      listeners.delete(listener);
    },
    dispatchEvent() {
      return false;
    },
  };

  // jsdom has no `MediaQueryList` to extend, and the surface above is everything the app touches.
  return list as unknown as MediaQueryList;
}

/**
 * Installs a controllable `matchMedia`, defaulting to light. Called from `jest.setup.ts` before each
 * test, so an OS-theme change made by one test cannot leak into the next.
 */
export function installMatchMedia(): void {
  prefersDark = false;
  listeners.clear();
  window.matchMedia = createMediaQueryList;
}

/**
 * Changes the reported OS preference and notifies subscribers. Set it before `render` to choose the
 * theme a component mounts with; wrap it in `act` to simulate a change while one is mounted.
 */
export function setSystemTheme(theme: Theme): void {
  prefersDark = theme === 'dark';
  const event = { matches: prefersDark, media: DARK_QUERY } as MediaQueryListEvent;
  for (const listener of [...listeners]) {
    listener(event);
  }
}
