import {
  STORAGE_KEY,
  applyStoredTheme,
  applyTheme,
  readStoredTheme,
  systemTheme,
  watchSystemTheme,
  writeStoredTheme,
} from '@/lib/theme';
import { setSystemTheme } from '@/testing/matchMedia';

/** jsdom carries both across tests in a file, so neither can be left to the previous case. */
beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  jest.restoreAllMocks();
});

function storedAttribute(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('stored preference', () => {
  it('round-trips each theme', () => {
    writeStoredTheme('dark');
    expect(readStoredTheme()).toBe('dark');

    writeStoredTheme('light');
    expect(readStoredTheme()).toBe('light');
  });

  it('reads as no preference when nothing is stored', () => {
    expect(readStoredTheme()).toBeNull();
  });

  it('writes only the bare theme name under a namespaced key', () => {
    writeStoredTheme('dark');

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(STORAGE_KEY).toBe('d3-react:theme');
  });
});

describe('untrusted stored values', () => {
  // Anything on this origin can write this key, so the read is treated as attacker-controlled. Each
  // of these must read as "no preference" and leave the attribute — the only sink — untouched.
  const hostile = [
    'DARK',
    '"dark"',
    ' dark ',
    '{}',
    '</style><script>alert(1)</script>',
    'dark; --page: red',
    'light dark',
    '',
  ];

  it.each(hostile)('rejects %j rather than trusting it', (value) => {
    window.localStorage.setItem(STORAGE_KEY, value);

    expect(readStoredTheme()).toBeNull();
  });

  it.each(hostile)('never lets %j reach the document', (value) => {
    window.localStorage.setItem(STORAGE_KEY, value);

    applyStoredTheme();

    expect(storedAttribute()).toBeNull();
  });
});

describe('unavailable storage', () => {
  it('reads as no preference when access throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(readStoredTheme()).toBeNull();
  });

  it('does not fail the write when storage refuses it', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded.', 'QuotaExceededError');
    });

    expect(() => writeStoredTheme('dark')).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('pins a theme on the root element', () => {
    applyTheme('dark');

    expect(storedAttribute()).toBe('dark');
  });

  it('removes the attribute so the media query resumes control', () => {
    applyTheme('dark');
    applyTheme(null);

    expect(storedAttribute()).toBeNull();
  });

  it('applies what is stored', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');

    applyStoredTheme();

    expect(storedAttribute()).toBe('light');
  });
});

describe('system theme', () => {
  it('reports the OS preference', () => {
    expect(systemTheme()).toBe('light');

    setSystemTheme('dark');

    expect(systemTheme()).toBe('dark');
  });

  it('falls back to light where matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    expect(systemTheme()).toBe('light');
  });

  it('notifies a watcher until it is cleaned up', () => {
    const onChange = jest.fn();
    const stop = watchSystemTheme(onChange);

    setSystemTheme('dark');
    expect(onChange).toHaveBeenCalledWith('dark');

    stop();
    setSystemTheme('light');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('watches inertly where matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    expect(() => watchSystemTheme(jest.fn())()).not.toThrow();
  });
});
