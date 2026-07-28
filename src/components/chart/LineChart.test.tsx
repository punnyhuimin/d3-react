import { fireEvent, render, screen } from '@testing-library/react';
import { userRecords } from '@/data/users';
import { aggregateByCategory, formatPercent, type CategoryPoint } from '@/lib/aggregate';
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

    expect(screen.getByText(/no categories in this range/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

/** The plot origin is (0,0) under jsdom, so a pointer `clientX` reads straight as a plot pixel. */
function dotX(container: HTMLElement, index: number): number {
  return Number(container.querySelectorAll('.dot')[index]?.getAttribute('cx'));
}

function pinpointX(container: HTMLElement): number | null {
  const node = container.querySelector('.pinpoint');
  return node === null ? null : Number(node.getAttribute('cx'));
}

function tooltipText(container: HTMLElement): string {
  return container.querySelector('.tooltip')?.textContent ?? '';
}

function overlayOf(container: HTMLElement): Element {
  const overlay = container.querySelector('.overlay');
  if (overlay === null) {
    throw new Error('the pointer overlay is missing');
  }
  return overlay;
}

describe('LineChart crosshair', () => {
  it('shows nothing until the reader points at the plot', () => {
    const { container } = render(<LineChart points={points} />);

    expect(pinpointX(container)).toBeNull();
    expect(container.querySelector('.tooltip')).toBeNull();
  });

  it('snaps to the nearest point rather than floating with the pointer', () => {
    const { container } = render(<LineChart points={points} />);
    const target = points[2];
    expect(target).toBeDefined();

    // A pointer a little past the third dot must still read the third dot.
    fireEvent.pointerMove(overlayOf(container), { clientX: dotX(container, 2) + 6 });

    expect(pinpointX(container)).toBe(dotX(container, 2));
    expect(tooltipText(container)).toContain(formatPercent(target?.percent ?? NaN));
  });

  it('sticks to a bracketing point inside a gap instead of floating over the absence', () => {
    const { container } = render(<LineChart points={points} />);
    const gap = gaps[0];
    expect(gap).toBeDefined();

    const fromX = dotX(
      container,
      points.findIndex((point) => point.category === gap?.from.category),
    );
    const toX = dotX(
      container,
      points.findIndex((point) => point.category === gap?.to.category),
    );

    fireEvent.pointerMove(overlayOf(container), { clientX: (fromX + toX) / 2 });

    expect([fromX, toX]).toContain(pinpointX(container));
  });

  it('shows the merged user names of a category holding more than one user', () => {
    const { container } = render(<LineChart points={points} />);
    const merged = points.findIndex((point) => point.users.length > 1);
    expect(merged).toBeGreaterThanOrEqual(0);

    fireEvent.pointerMove(overlayOf(container), { clientX: dotX(container, merged) });

    expect(tooltipText(container)).toContain(points[merged]?.label);
  });

  it('clears when the pointer leaves the plot', () => {
    const { container } = render(<LineChart points={points} />);

    fireEvent.pointerMove(overlayOf(container), { clientX: dotX(container, 1) });
    expect(pinpointX(container)).not.toBeNull();

    fireEvent.pointerLeave(overlayOf(container));
    expect(pinpointX(container)).toBeNull();
  });

  it('announces the pinned reading to assistive technology', () => {
    const { container } = render(<LineChart points={points} />);
    const target = points[3];

    fireEvent.pointerMove(overlayOf(container), { clientX: dotX(container, 3) });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`Category ${target?.category}`);
    expect(status).toHaveTextContent(formatPercent(target?.percent ?? NaN));
  });
});

describe('LineChart keyboard', () => {
  it('steps forward from the first point with the right arrow', () => {
    const { container } = render(<LineChart points={points} />);
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(pinpointX(container)).toBe(dotX(container, 0));

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(pinpointX(container)).toBe(dotX(container, 1));
  });

  it('steps back with the left arrow and stops at the ends', () => {
    const { container } = render(<LineChart points={points} />);
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(pinpointX(container)).toBe(dotX(container, points.length - 1));

    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(pinpointX(container)).toBe(dotX(container, points.length - 1));

    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(pinpointX(container)).toBe(dotX(container, points.length - 2));
  });

  it('jumps to either end with Home and End', () => {
    const { container } = render(<LineChart points={points} />);
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'End' });
    expect(pinpointX(container)).toBe(dotX(container, points.length - 1));

    fireEvent.keyDown(chart, { key: 'Home' });
    expect(pinpointX(container)).toBe(dotX(container, 0));
  });

  it('clears on Escape and ignores keys it does not handle', () => {
    const { container } = render(<LineChart points={points} />);
    const chart = screen.getByRole('img');

    fireEvent.keyDown(chart, { key: 'Home' });
    fireEvent.keyDown(chart, { key: 'a' });
    expect(pinpointX(container)).toBe(dotX(container, 0));

    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(pinpointX(container)).toBeNull();
  });

  it('is reachable by keyboard at all', () => {
    render(<LineChart points={points} />);

    expect(screen.getByRole('img')).toHaveAttribute('tabindex', '0');
  });
});
