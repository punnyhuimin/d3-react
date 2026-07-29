import { useTheme } from '@/hooks/useTheme';
import styles from '@/components/theme/themeToggle.module.css';

/**
 * Pins the colour theme, overriding the OS setting.
 *
 * The accessible name is deliberately fixed — "Dark mode" — with `aria-pressed` carrying the state.
 * A label that flipped alongside the state would announce the two in opposite directions, leaving it
 * ambiguous whether the button reports what is on or what a press would do.
 */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className={styles.icon} aria-hidden="true">
        {isDark ? '☾' : '☀'}
      </span>
      {isDark ? 'Dark mode' : 'Light mode'}
    </button>
  );
}
