import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  readStoredTheme,
  systemTheme,
  watchSystemTheme,
  writeStoredTheme,
  type Theme,
} from '@/lib/theme';

export interface ThemeControl {
  /** The pinned choice, or `null` while the app is still following the OS. */
  preference: Theme | null;
  /** The theme actually in effect right now — the pinned choice, else the OS setting. */
  resolved: Theme;
  /** Pins a theme for this session and persists it. */
  setTheme: (theme: Theme) => void;
}

/**
 * Reads and writes the theme preference. Nothing outside this tab mutates the stored value, so plain
 * state is enough: storage is read once through the lazy initialiser rather than on every render.
 *
 * The DOM write lives in an effect keyed on the preference rather than inside `setTheme`, so the
 * attribute is correct on mount as well and cannot drift from the state that describes it.
 */
export function useTheme(): ThemeControl {
  const [preference, setPreference] = useState<Theme | null>(readStoredTheme);
  const [system, setSystem] = useState<Theme>(systemTheme);

  useEffect(() => watchSystemTheme(setSystem), []);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const setTheme = useCallback((theme: Theme) => {
    setPreference(theme);
    writeStoredTheme(theme);
  }, []);

  return { preference, resolved: preference ?? system, setTheme };
}
