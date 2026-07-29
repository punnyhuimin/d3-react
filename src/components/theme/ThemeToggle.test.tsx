import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { STORAGE_KEY } from '@/lib/theme';
import { setSystemTheme } from '@/testing/matchMedia';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

function toggle(): HTMLElement {
  return screen.getByRole('button', { name: /dark mode/i });
}

describe('ThemeToggle', () => {
  it('follows the OS setting when nothing has been pinned', () => {
    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('reflects an OS preference for dark', () => {
    setSystemTheme('dark');

    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('pins the opposite theme and persists it', () => {
    render(<ThemeToggle />);

    fireEvent.click(toggle());

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('restores a stored preference on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('lets a stored preference override the OS setting', () => {
    setSystemTheme('dark');
    window.localStorage.setItem(STORAGE_KEY, 'light');

    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('falls back to the OS setting when the stored value is not a theme', () => {
    setSystemTheme('dark');
    window.localStorage.setItem(STORAGE_KEY, '</style><script>alert(1)</script>');

    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('follows a mid-session OS change while unpinned', () => {
    render(<ThemeToggle />);

    act(() => setSystemTheme('dark'));

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores a mid-session OS change once pinned', () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    render(<ThemeToggle />);

    act(() => setSystemTheme('dark'));

    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
