import { fireEvent, render, screen } from '@testing-library/react';
import { userRecords } from '@/data/users';
import { aggregateByCategory } from '@/lib/aggregate';
import { BrushSummary } from '@/components/chart/BrushSummary';
import { afterDragSettles, brushGroupOf, dragBrush } from '@/testing/brushGesture';

const points = aggregateByCategory(userRecords);

function noop() {}

// A drag arms d3's click guard on the shared `window`, and it expires on a macrotask. Without this
// drain a dragging test silently swallows the next test's click.
afterEach(afterDragSettles);

describe('BrushSummary', () => {
  it('lets d3 attach the brush inside its own group', () => {
    const { container } = render(<BrushSummary points={points} selection={null} onSelect={noop} />);

    expect(brushGroupOf(container).querySelector('rect.overlay')).not.toBeNull();
  });

  it('draws the whole series even while the main chart is filtered', () => {
    const filtered = render(<BrushSummary points={points} selection={[7, 9]} onSelect={noop} />);
    const filteredPath = filtered.container.querySelector('.summaryLine')?.getAttribute('d');
    filtered.unmount();

    const full = render(<BrushSummary points={points} selection={null} onSelect={noop} />);
    const fullPath = full.container.querySelector('.summaryLine')?.getAttribute('d');

    expect(filteredPath).toBe(fullPath);
    expect(filteredPath).toBeTruthy();
  });

  it('keeps the same two-path treatment as the main chart', () => {
    const { container } = render(<BrushSummary points={points} selection={null} onSelect={noop} />);

    expect(container.querySelectorAll('.summaryGapLine').length).toBeGreaterThan(0);
  });

  it('offers Reset only once there is something to reset', () => {
    const { rerender } = render(<BrushSummary points={points} selection={null} onSelect={noop} />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();

    rerender(<BrushSummary points={points} selection={[7, 9]} onSelect={noop} />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled();
  });

  it('reports the dragged range inverted back into category values', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <BrushSummary points={points} selection={null} onSelect={onSelect} />,
    );

    dragBrush(brushGroupOf(container), 100, 260);

    expect(onSelect).toHaveBeenCalled();
    const reported = onSelect.mock.calls.at(-1)?.[0] as [number, number];
    expect(reported[0]).toBeLessThan(reported[1]);
    expect(reported[0]).toBeGreaterThanOrEqual(points[0]?.category ?? NaN);
    expect(reported[1]).toBeLessThanOrEqual(points.at(-1)?.category ?? NaN);
  });

  it('reports a cleared selection when Reset is pressed', () => {
    const onSelect = jest.fn();
    render(<BrushSummary points={points} selection={[7, 9]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('renders nothing when there is no series to summarise', () => {
    const { container } = render(<BrushSummary points={[]} selection={null} onSelect={noop} />);

    expect(container).toBeEmptyDOMElement();
  });
});
