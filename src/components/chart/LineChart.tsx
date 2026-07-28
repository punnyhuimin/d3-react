import {
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as d3 from 'd3';
import { formatPercent, type CategoryPoint } from '@/lib/aggregate';
import { buildDisplaySeries, buildGapSegments, type DisplayPoint } from '@/lib/missingData';
import { nearestPoint } from '@/lib/nearestPoint';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { Axis } from '@/components/chart/Axis';
import { Crosshair } from '@/components/chart/Crosshair';
import { Tooltip } from '@/components/chart/Tooltip';
import styles from '@/components/chart/chart.module.css';

const MARGIN = { top: 16, right: 24, bottom: 36, left: 52 };
/** The brief's default reading: the full 0–100% scale at 10% ticks. Phase 7 rescales on brush. */
const Y_TICKS = d3.range(0, 101, 10);
/** Used until the container reports a width, and permanently where `ResizeObserver` is absent. */
const FALLBACK_WIDTH = 640;
/** Matches the tooltip's max-width in CSS; the card flips rather than clipping the right edge. */
const TOOLTIP_WIDTH = 220;

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
 *
 * The crosshair is sticky: pointing anywhere in the plot pins the nearest real point, including
 * inside a gap, where it holds to a bracketing point instead of floating over an absence. Keyboard
 * has parity — arrows step, Home/End jump, Escape clears — and the pinned reading is announced.
 */
export function LineChart({ points, height = 320 }: LineChartProps) {
  const { ref, width } = useResizeObserver<HTMLDivElement>(FALLBACK_WIDTH);
  const [pinnedCategory, setPinnedCategory] = useState<number | null>(null);
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

  // Resolved by category rather than held as an object, so the pin survives the points array being
  // rebuilt — which is exactly what the Phase 7 brush will do on every drag.
  const active = points.find((point) => point.category === pinnedCategory) ?? null;

  function pinFromPointer(event: ReactPointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const snapped = nearestPoint(points, x.invert(event.clientX - bounds.left));
    setPinnedCategory(snapped?.category ?? null);
  }

  function handleKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key === 'Escape') {
      setPinnedCategory(null);
      return;
    }

    const current = points.findIndex((point) => point.category === pinnedCategory);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = current < 0 ? 0 : Math.min(current + 1, points.length - 1);
        break;
      case 'ArrowLeft':
        next = current < 0 ? points.length - 1 : Math.max(current - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = points.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setPinnedCategory(points[next]?.category ?? null);
  }

  const anchorX = active === null ? 0 : MARGIN.left + x(active.category);
  const anchorY = active === null ? 0 : MARGIN.top + y(active.percent);

  return (
    <div ref={ref} className={styles.container}>
      <svg
        className={styles.chart}
        width={width}
        height={height}
        role="img"
        aria-label={`Percent of total value by category, ${formatCategory(first.category)} to ${formatCategory(last.category)}.${gapNote} Use the arrow keys to step through the categories; the same figures are listed in the table below.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={() => setPinnedCategory(null)}
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
          {active === null ? null : (
            <Crosshair
              x={x(active.category)}
              y={y(active.percent)}
              width={innerWidth}
              height={innerHeight}
            />
          )}
          {/* Last, so the whole plot is one hit target — the reader aims at a region, not a 2px line. */}
          <rect
            className={styles.overlay}
            width={innerWidth}
            height={innerHeight}
            onPointerMove={pinFromPointer}
            onPointerLeave={() => setPinnedCategory(null)}
          />
        </g>
      </svg>
      {active === null ? null : (
        <Tooltip
          point={active}
          x={anchorX}
          y={anchorY}
          flip={anchorX + TOOLTIP_WIDTH + 20 > width}
        />
      )}
      <p className={styles.visuallyHidden} role="status">
        {active === null
          ? ''
          : `Category ${active.category}, ${formatPercent(active.percent)} of the total, value ${active.total}, ${active.label}.`}
      </p>
    </div>
  );
}
