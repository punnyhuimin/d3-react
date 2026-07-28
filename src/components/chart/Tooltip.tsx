import { formatPercent, type CategoryPoint } from '@/lib/aggregate';
import styles from '@/components/chart/chart.module.css';

export interface TooltipProps {
  point: CategoryPoint;
  /** The anchor in container pixels — the pinned point's position on the page, not in the plot. */
  x: number;
  y: number;
  /** Sit to the left of the anchor instead of the right, so the card never clips the edge. */
  flip: boolean;
}

/**
 * An HTML card rather than a `foreignObject`: text renders with the page's own hinting and wraps
 * normally. The percent leads as the strong element because the reader already has the category and
 * wants the number. User names arrive as React children, never as an HTML string.
 */
export function Tooltip({ point, x, y, flip }: TooltipProps) {
  return (
    <div
      className={styles.tooltip}
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
      }}
    >
      <p className={styles.tooltipValue}>{formatPercent(point.percent)}</p>
      <dl className={styles.tooltipList}>
        <dt>Category</dt>
        <dd>{point.category}</dd>
        <dt>Value</dt>
        <dd>{point.total}</dd>
        <dt>{point.users.length === 1 ? 'User' : 'Users'}</dt>
        <dd>{point.label}</dd>
      </dl>
    </div>
  );
}
