import { useMemo } from 'react';
import * as d3 from 'd3';
import type { CategoryPoint } from '@/lib/aggregate';
import { buildDisplaySeries, buildGapSegments, type DisplayPoint } from '@/lib/missingData';
import { xDomainFor } from '@/lib/domains';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { useBrushX } from '@/hooks/useBrushX';
import { FALLBACK_WIDTH, SUMMARY_MARGIN } from '@/components/chart/plotArea';
import styles from '@/components/chart/chart.module.css';

export interface BrushSummaryProps {
  /** The **full** series, always — never the filtered slice. */
  points: CategoryPoint[];
  selection: [number, number] | null;
  onSelect: (selection: [number, number] | null) => void;
  height?: number;
}

/**
 * The context strip under the main chart: drag across it to filter, and the main chart narrows its
 * X range and rescales Y to what is left.
 *
 * It always draws the whole series regardless of the current filter.
 */
export function BrushSummary({ points, selection, onSelect, height = 64 }: BrushSummaryProps) {
  const { ref, width } = useResizeObserver<HTMLDivElement>(FALLBACK_WIDTH);
  const series = useMemo(() => buildDisplaySeries(points), [points]);
  const gaps = useMemo(() => buildGapSegments(points), [points]);

  const innerWidth = Math.max(width - SUMMARY_MARGIN.left - SUMMARY_MARGIN.right, 1);
  const innerHeight = Math.max(height - SUMMARY_MARGIN.top - SUMMARY_MARGIN.bottom, 1);

  // Computed before any early return so the hook below is never called conditionally. An empty
  // series has no domain, and the placeholder is never rendered.
  const domain = xDomainFor(series);
  const x = d3
    .scaleLinear()
    .domain(domain ?? [0, 1])
    .range([0, innerWidth]);

  const { ref: brushRef, clear } = useBrushX({
    scale: x,
    width: innerWidth,
    height: innerHeight,
    onSelect,
  });

  const percents = points.map((point) => point.percent);
  const [, maxPercent] = d3.extent(percents);
  const y = d3
    .scaleLinear()
    .domain([0, maxPercent ?? 1])
    .range([innerHeight, 0]);

  const linePath = d3
    .line<DisplayPoint>()
    .defined((slot) => slot.percent !== null)
    .x((slot) => x(slot.category))
    .y((slot) => y(slot.percent ?? 0))(series);

  if (domain === null) {
    return null;
  }

  return (
    <div className={styles.summary}>
      <div className={styles.summaryHeader}>
        <p className={styles.summaryHint}>Drag across the strip to filter the chart above.</p>
        <button
          type="button"
          className={styles.reset}
          onClick={clear}
          disabled={selection === null}
        >
          Reset
        </button>
      </div>
      <div ref={ref} className={styles.summaryPlot}>
        <svg
          className={styles.chart}
          width={width}
          height={height}
          role="img"
          aria-label="Summary of the whole series. Drag across it to filter the chart above."
        >
          <g transform={`translate(${SUMMARY_MARGIN.left},${SUMMARY_MARGIN.top})`}>
            {gaps.map((gap) => (
              <line
                key={gap.from.category}
                className={styles.summaryGapLine}
                x1={x(gap.from.category)}
                y1={y(gap.from.percent)}
                x2={x(gap.to.category)}
                y2={y(gap.to.percent)}
              />
            ))}
            {linePath === null ? null : <path className={styles.summaryLine} d={linePath} />}
            <g ref={brushRef} className={styles.brush} />
          </g>
        </svg>
      </div>
    </div>
  );
}
