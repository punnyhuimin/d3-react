import { fireEvent, render, screen, within } from '@testing-library/react';
import { userRecords } from '@/data/users';
import { aggregateByCategory } from '@/lib/aggregate';
import { PercentByCategoryChart } from '@/features/percent-by-category/PercentByCategoryChart';
import { afterDragSettles, brushGroupOf, dragBrush } from '@/testing/brushGesture';

const points = aggregateByCategory(userRecords);

function plottedCategories(container: HTMLElement): number {
  return container.querySelectorAll('.dot').length;
}

/** Only the value axis is labelled in percent, so this reads the Y ticks and nothing else. */
function percentTicks(container: HTMLElement): string[] {
  return [...container.querySelectorAll('text')]
    .map((node) => node.textContent ?? '')
    .filter((text) => text.endsWith('%'));
}

function tableRows(): number {
  const [body] = screen.getAllByRole('rowgroup').slice(1);
  return within(body as HTMLElement).getAllByRole('row').length;
}

describe('PercentByCategoryChart', () => {
  it('plots every category against the full percentage scale before any filtering', () => {
    const { container } = render(<PercentByCategoryChart />);

    expect(plottedCategories(container)).toBe(points.length);
    expect(percentTicks(container)).toContain('0%');
    expect(percentTicks(container)).toContain('100%');
  });

  it('narrows the main chart to the brushed range', () => {
    const { container } = render(<PercentByCategoryChart />);

    dragBrush(brushGroupOf(container), 100, 260);

    const remaining = plottedCategories(container);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(points.length);
  });

  it('rescales Y onto the selection instead of holding 0 to 100', () => {
    const { container } = render(<PercentByCategoryChart />);

    dragBrush(brushGroupOf(container), 100, 260);

    const ticks = percentTicks(container);
    expect(ticks).not.toContain('100%');
    expect(ticks.length).toBeGreaterThan(1);
  });

  it('keeps the table complete while the chart is filtered, so the shares still sum to 100', () => {
    const { container } = render(<PercentByCategoryChart />);

    dragBrush(brushGroupOf(container), 100, 260);

    expect(plottedCategories(container)).toBeLessThan(points.length);
    expect(tableRows()).toBe(points.length);
  });

  it('says how much of the data the filter is showing', () => {
    const { container } = render(<PercentByCategoryChart />);
    expect(screen.queryByText(/filtered to/i)).not.toBeInTheDocument();

    dragBrush(brushGroupOf(container), 100, 260);

    expect(screen.getByText(/filtered to/i)).toBeInTheDocument();
  });

  it('restores the full range and the full scale when Reset is pressed', async () => {
    const { container } = render(<PercentByCategoryChart />);

    dragBrush(brushGroupOf(container), 100, 260);
    expect(plottedCategories(container)).toBeLessThan(points.length);

    await afterDragSettles();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(plottedCategories(container)).toBe(points.length);
    expect(percentTicks(container)).toContain('100%');
    expect(screen.queryByText(/filtered to/i)).not.toBeInTheDocument();
  });

  it('holds the whole series in the summary while the main chart is filtered', () => {
    const { container } = render(<PercentByCategoryChart />);
    const before = container.querySelector('.summaryLine')?.getAttribute('d');

    dragBrush(brushGroupOf(container), 100, 260);

    expect(container.querySelector('.summaryLine')?.getAttribute('d')).toBe(before);
  });
});
