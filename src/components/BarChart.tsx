import * as d3 from 'd3';
import { useD3 } from '@/hooks/useD3';

export interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  width?: number;
  height?: number;
}

const MARGIN = { top: 16, right: 16, bottom: 32, left: 40 };

export function BarChart({ data, width = 480, height = 320 }: BarChartProps) {
  const ref = useD3(
    (svg) => {
      const innerWidth = width - MARGIN.left - MARGIN.right;
      const innerHeight = height - MARGIN.top - MARGIN.bottom;

      svg.attr('width', width).attr('height', height);
      svg.selectAll('*').remove();

      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerWidth])
        .padding(0.2);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value) ?? 0])
        .nice()
        .range([innerHeight, 0]);

      g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
      g.append('g').call(d3.axisLeft(y));

      g.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', (d) => x(d.label) ?? 0)
        .attr('y', (d) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d) => innerHeight - y(d.value))
        .attr('fill', 'steelblue');
    },
    [data, width, height],
  );

  return <svg ref={ref} role="img" aria-label="Bar chart" />;
}
