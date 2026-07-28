import type * as d3 from 'd3';
import styles from '@/components/chart/chart.module.css';

export interface AxisProps {
  scale: d3.ScaleLinear<number, number>;
  /** `bottom` runs along the foot of the plot area, `left` up its side. */
  orientation: 'bottom' | 'left';
  /**
   * Every tick to draw, given explicitly rather than left to `scale.ticks()`. That is what lets the
   * X axis label a missing category: the slot is ticked and named, it simply carries no point.
   */
  tickValues: number[];
  format: (value: number) => string;
  /** Plot area size in pixels — the baseline spans one edge, gridlines cross to the other. */
  width: number;
  height: number;
  /** Hairline gridlines across the plot. For the value axis only; the category axis has none. */
  showGrid?: boolean;
}

/**
 * One declarative axis, used for both X and Y. Rendered from `tickValues` as ordinary JSX rather
 * than by `d3.axisBottom`, so React stays the only writer of these nodes and the recessive
 * grid/tick styling is ours rather than D3's defaults.
 */
export function Axis({
  scale,
  orientation,
  tickValues,
  format,
  width,
  height,
  showGrid = false,
}: AxisProps) {
  const isBottom = orientation === 'bottom';

  return (
    <g transform={isBottom ? `translate(0,${height})` : undefined}>
      <line
        className={styles.baseline}
        x1={0}
        y1={0}
        x2={isBottom ? width : 0}
        y2={isBottom ? 0 : height}
      />
      {tickValues.map((value) =>
        isBottom ? (
          <g key={value} transform={`translate(${scale(value)},0)`}>
            <line className={styles.tick} y2={6} />
            <text className={styles.tickLabel} y={9} dy="0.71em" textAnchor="middle">
              {format(value)}
            </text>
          </g>
        ) : (
          <g key={value} transform={`translate(0,${scale(value)})`}>
            {showGrid ? <line className={styles.gridline} x2={width} /> : null}
            <line className={styles.tick} x2={-6} />
            <text className={styles.tickLabel} x={-9} dy="0.32em" textAnchor="end">
              {format(value)}
            </text>
          </g>
        ),
      )}
    </g>
  );
}
