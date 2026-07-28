import { render, screen } from '@testing-library/react';
import { userRecords } from '@/data/users';
import { aggregateByCategory, type CategoryPoint } from '@/lib/aggregate';
import { buildDisplaySeries, buildGapSegments, findMissingCategories } from '@/lib/missingData';
import { LineChart } from '@/components/chart/LineChart';

const points = aggregateByCategory(userRecords);
const gaps = buildGapSegments(points);

/** A minimal point, so a fixture describes only the shape under test: which categories exist. */
function pointAt(category: number, percent = 10): CategoryPoint {
  return { category, users: [`u${category}`], label: `u${category}`, total: percent, percent };
}

function subpathCount(path: Element | null): number {
  return (path?.getAttribute('d')?.match(/M/g) ?? []).length;
}

describe('LineChart', () => {
  it('draws one dot per real category, and none for the missing ones', () => {
    const { container } = render(<LineChart points={points} />);

    expect(container.querySelectorAll('.dot')).toHaveLength(points.length);
    expect(points.length).toBeLessThan(buildDisplaySeries(points).length);
  });

  it('breaks the line at each gap rather than bridging it', () => {
    const { container } = render(<LineChart points={points} />);

    expect(gaps.length).toBeGreaterThan(0);
    expect(subpathCount(container.querySelector('.line'))).toBe(gaps.length + 1);
  });

  it('draws a single unbroken path when no category is missing', () => {
    const { container } = render(<LineChart points={[pointAt(1), pointAt(2), pointAt(3)]} />);

    expect(subpathCount(container.querySelector('.line'))).toBe(1);
  });

  it('labels every category on the X axis, including the ones with no records', () => {
    const { container } = render(<LineChart points={points} />);
    const labels = [...container.querySelectorAll('text')].map((node) => node.textContent);

    for (const category of buildDisplaySeries(points).map((slot) => slot.category)) {
      expect(labels).toContain(String(category));
    }
    expect(findMissingCategories(points).length).toBeGreaterThan(0);
  });

  it('renders one dashed bridge per gap', () => {
    const { container } = render(<LineChart points={points} />);

    expect(container.querySelectorAll('.gapLine')).toHaveLength(gaps.length);
  });

  it('scales the Y axis over the full 0 to 100 percent range', () => {
    const { container } = render(<LineChart points={points} />);
    const labels = [...container.querySelectorAll('text')].map((node) => node.textContent);

    expect(labels).toContain('0%');
    expect(labels).toContain('100%');
  });

  it('names the missing categories in the accessible description', () => {
    render(<LineChart points={points} />);

    const chart = screen.getByRole('img');
    for (const category of findMissingCategories(points)) {
      expect(chart).toHaveAccessibleName(new RegExp(`\\b${category}\\b`));
    }
  });

  it('places every mark at a finite coordinate inside the plot area', () => {
    const { container } = render(<LineChart points={points} />);

    for (const dot of container.querySelectorAll('.dot')) {
      const cx = Number(dot.getAttribute('cx'));
      const cy = Number(dot.getAttribute('cy'));
      expect(Number.isFinite(cx) && Number.isFinite(cy)).toBe(true);
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cy).toBeGreaterThanOrEqual(0);
    }
    expect(container.querySelector('.line')?.getAttribute('d')).not.toMatch(/NaN/);
  });

  it('falls back to a note when there is nothing to plot', () => {
    render(<LineChart points={[]} />);

    expect(screen.getByText(/no categories to plot/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
