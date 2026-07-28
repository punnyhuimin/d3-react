import { useMemo } from 'react';
import * as d3 from 'd3';
import { formatPercent, type CategoryPoint } from '@/lib/aggregate';
import { buildDisplaySeries, buildGapSegments, type DisplayPoint } from '@/lib/missingData';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { Axis } from '@/components/chart/Axis';
import styles from '@/components/chart/chart.module.css';

const MARGIN = { top: 16, right: 24, bottom: 36, left: 52 };
/** The brief's default reading: the full 0–100% scale at 10% ticks. Phase 7 rescales on brush. */
const Y_TICKS = d3.range(0, 101, 10);
/** Used until the container reports a width, and permanently where `ResizeObserver` is absent. */
const FALLBACK_WIDTH = 640;

const formatCategory = d3.format('d');

/** `'12'` for a lone missing category, `'12–13'` for a run of them. */
function describeGap(missing: number[]): string {
  const first = missing[0];
  const last = missing.at(-1);
  if (first === undefined || last === undefined) {
    return '';
  }
  return first === last
    ? formatCategory(first)
    : `${formatCategory(first)}–${formatCategory(last)}`;
}

export interface LineChartProps {
  points: CategoryPoint[];
  height?: number;
}

/**
 * Percent value against category. The main path breaks wherever the dataset has no records — the
 * gap is bridged by a faint dashed segment and labelled, so a reader sees an absence rather than an
 * invented straight line. D3 computes the scales and the path; React renders every node.
 */
export function LineChart({ points, height = 320 }: LineChartProps) {
  const { ref, width } = useResizeObserver<HTMLDivElement>(FALLBACK_WIDTH);
  const series = useMemo(() => buildDisplaySeries(points), [points]);
  const gaps = useMemo(() => buildGapSegments(points), [points]);

  const first = series[0];
  const last = series.at(-1);
  if (first === undefined || last === undefined) {
    return <p className={styles.empty}>No categories to plot.</p>;
  }

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 1);

  // A single-category dataset would otherwise collapse the domain to a point.
  const xDomain: [number, number] =
    first.category === last.category
      ? [first.category - 0.5, last.category + 0.5]
      : [first.category, last.category];

  const x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

  const linePath = d3
    .line<DisplayPoint>()
    .defined((slot) => slot.percent !== null)
    .x((slot) => x(slot.category))
    .y((slot) => y(slot.percent ?? 0))(series);

  const gapNote =
    gaps.length === 0
      ? ''
      : ` Categories ${gaps.map((gap) => describeGap(gap.missing)).join(', ')} have no records.`;

  return (
    <div ref={ref} className={styles.container}>
      <svg
        className={styles.chart}
        width={width}
        height={height}
        role="img"
        aria-label={`Percent of total value by category, ${formatCategory(first.category)} to ${formatCategory(last.category)}.${gapNote} The same figures are listed in the table below.`}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <Axis
            scale={y}
            orientation="left"
            tickValues={Y_TICKS}
            format={formatPercent}
            width={innerWidth}
            height={innerHeight}
            showGrid
          />
          <Axis
            scale={x}
            orientation="bottom"
            tickValues={series.map((slot) => slot.category)}
            format={formatCategory}
            width={innerWidth}
            height={innerHeight}
          />
          {gaps.map((gap) => (
            <g key={gap.from.category}>
              <line
                className={styles.gapLine}
                x1={x(gap.from.category)}
                y1={y(gap.from.percent)}
                x2={x(gap.to.category)}
                y2={y(gap.to.percent)}
              />
              <text
                className={styles.gapLabel}
                x={(x(gap.from.category) + x(gap.to.category)) / 2}
                y={(y(gap.from.percent) + y(gap.to.percent)) / 2 - 10}
                textAnchor="middle"
              >
                {describeGap(gap.missing)} missing
              </text>
            </g>
          ))}
          {linePath === null ? null : <path className={styles.line} d={linePath} />}
          {points.map((point) => (
            <circle
              key={point.category}
              className={styles.dot}
              cx={x(point.category)}
              cy={y(point.percent)}
              r={4}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
