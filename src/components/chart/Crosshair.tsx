import styles from '@/components/chart/chart.module.css';

export interface CrosshairProps {
  /** The pinned point's position in plot pixels. */
  x: number;
  y: number;
  /** Plot area size, so the hairlines span it fully. */
  width: number;
  height: number;
}

/**
 * The pinpoint: two hairlines to the axes and an emphasised dot where they meet, ringed in the
 * surface colour so it reads against the series line it sits on. Holds no state and does no
 * hit-testing — {@link LineChart} decides which point is pinned, this only draws it.
 */
export function Crosshair({ x, y, width, height }: CrosshairProps) {
  return (
    <g className={styles.crosshair}>
      <line className={styles.crosshairLine} x1={x} y1={0} x2={x} y2={height} />
      <line className={styles.crosshairLine} x1={0} y1={y} x2={width} y2={y} />
      <circle className={styles.pinpoint} cx={x} cy={y} r={5.5} />
    </g>
  );
}
