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
import { DEFAULT_Y_DOMAIN, xDomainFor, Y_TICK_COUNT } from '@/lib/domains';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { Axis } from '@/components/chart/Axis';
import { Crosshair } from '@/components/chart/Crosshair';
import { Tooltip } from '@/components/chart/Tooltip';
import { FALLBACK_WIDTH, MAIN_MARGIN as MARGIN } from '@/components/chart/plotArea';
import styles from '@/components/chart/chart.module.css';

/** Matches the tooltip's max-width in CSS; the card flips rather than clipping the right edge. */
const TOOLTIP_WIDTH = 280;

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
  /**
   * Overrides the observed category extent, so a brushed range shows exactly the window the reader
   * selected rather than snapping out to the nearest categories inside it.
   */
  xDomain?: [number, number];
  /** Defaults to the brief's full 0–100% scale; a brush selection tightens it. */
  yDomain?: [number, number];
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
export function LineChart({
  points,
  height = 320,
  xDomain,
  yDomain = DEFAULT_Y_DOMAIN,
}: LineChartProps) {
  const { ref, width } = useResizeObserver<HTMLDivElement>(FALLBACK_WIDTH);
  const [pinnedCategory, setPinnedCategory] = useState<number | null>(null);
  const [isClickSelected, setIsClickSelected] = useState(false);
  const series = useMemo(() => buildDisplaySeries(points), [points]);
  const gaps = useMemo(() => buildGapSegments(points), [points]);

  const first = series[0];
  const last = series.at(-1);
  const observedDomain = xDomainFor(series);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 1);

  if (first === undefined || last === undefined || observedDomain === null) {
    return (
      <div ref={ref} className={styles.container} style={{ height }}>
        <p className={styles.empty}>No categories in this range.</p>
      </div>
    );
  }

  const x = d3
    .scaleLinear()
    .domain(xDomain ?? observedDomain)
    .range([0, innerWidth]);
  const y = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

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
  // rebuilt.
  const active = points.find((point) => point.category === pinnedCategory) ?? null;

  function pinFromPointer(event: ReactPointerEvent<SVGRectElement>) {
    if (isClickSelected) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const snapped = nearestPoint(points, x.invert(event.clientX - bounds.left));
    setPinnedCategory(snapped?.category ?? null);
  }

  function handleClick(event: ReactPointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const snapped = nearestPoint(points, x.invert(event.clientX - bounds.left));
    setPinnedCategory(snapped?.category ?? null);
    setIsClickSelected(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
    if (event.key === 'Escape') {
      setPinnedCategory(null);
      setIsClickSelected(false);
      return;
    }

    const current = points.findIndex((point) => point.category === pinnedCategory);
    let snapPointIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        snapPointIndex = current < 0 ? 0 : Math.min(current + 1, points.length - 1);
        break;
      case 'ArrowLeft':
        snapPointIndex = current < 0 ? points.length - 1 : Math.max(current - 1, 0);
        break;
      case 'Home':
        snapPointIndex = 0;
        break;
      case 'End':
        snapPointIndex = points.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setPinnedCategory(points[snapPointIndex]?.category ?? null);
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
        onBlur={() => {
          setPinnedCategory(null);
          setIsClickSelected(false);
        }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          <Axis
            scale={y}
            orientation="left"
            tickValues={y.ticks(Y_TICK_COUNT)}
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
            onPointerLeave={() => {
              if (!isClickSelected) {
                setPinnedCategory(null);
              }
            }}
            onClick={handleClick}
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
      <div className={styles.keyboardHint}>
        <p className={styles.keyboardHintTitle}>Keyboard navigation</p>
        <ul className={styles.keyboardHintList}>
          <li className={styles.keyboardHintItem}>
            <kbd className={styles.keyboardHintKey}>← →</kbd>
            <span className={styles.keyboardHintAction}>Step through categories</span>
          </li>
          <li className={styles.keyboardHintItem}>
            <kbd className={styles.keyboardHintKey}>Home</kbd>
            <span className={styles.keyboardHintAction}>Jump to first category</span>
          </li>
          <li className={styles.keyboardHintItem}>
            <kbd className={styles.keyboardHintKey}>End</kbd>
            <span className={styles.keyboardHintAction}>Jump to last category</span>
          </li>
          <li className={styles.keyboardHintItem}>
            <kbd className={styles.keyboardHintKey}>Esc</kbd>
            <span className={styles.keyboardHintAction}>Clear selection</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
