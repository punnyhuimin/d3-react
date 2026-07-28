import { render, screen, within } from '@testing-library/react';
import { userRecords } from '@/data/users';
import { aggregateByCategory, formatPercent } from '@/lib/aggregate';
import { DataTable } from '@/features/percent-by-category/DataTable';

const points = aggregateByCategory(userRecords);

describe('DataTable', () => {
  it('renders one body row per category', () => {
    render(<DataTable points={points} />);

    const [body] = screen.getAllByRole('rowgroup').slice(1);
    expect(body).toBeDefined();
    expect(within(body as HTMLElement).getAllByRole('row')).toHaveLength(points.length);
  });

  it('shows the merged user names of a category holding more than one user', () => {
    const merged = points.find((point) => point.users.length > 1);
    expect(merged).toBeDefined();

    render(<DataTable points={points} />);

    const row = screen.getByRole('row', { name: new RegExp(merged?.label ?? '') });
    expect(within(row).getByText(merged?.label ?? '')).toBeInTheDocument();
    expect(merged?.label).toContain(', ');
  });

  it('shows each category with its total and shared percent formatting', () => {
    render(<DataTable points={points} />);

    for (const point of points) {
      const header = screen.getByRole('rowheader', { name: String(point.category) });
      const row = header.closest('tr');
      expect(row).not.toBeNull();
      const cells = within(row as HTMLElement).getAllByRole('cell');
      expect(cells.map((cell) => cell.textContent)).toEqual([
        point.label,
        String(point.total),
        formatPercent(point.percent),
      ]);
    }
  });

  it('renders only the header row when there are no points', () => {
    render(<DataTable points={[]} />);

    expect(screen.queryAllByRole('rowheader')).toHaveLength(0);
    expect(screen.getAllByRole('row')).toHaveLength(1);
  });
});
