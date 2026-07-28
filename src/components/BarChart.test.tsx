import { render, screen } from '@testing-library/react';
import { BarChart } from '@/components/BarChart';

describe('BarChart', () => {
  it('renders an svg with the given dimensions', () => {
    render(<BarChart data={[{ label: 'A', value: 5 }]} width={200} height={100} />);

    const svg = screen.getByRole('img', { name: /bar chart/i });
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '100');
  });

  it('draws one bar per datum', () => {
    const { container } = render(
      <BarChart
        data={[
          { label: 'A', value: 5 },
          { label: 'B', value: 10 },
        ]}
      />,
    );

    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });
});
