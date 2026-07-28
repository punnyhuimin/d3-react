import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { userRecords, type UserRecord } from '@/data/users';
import { aggregateByCategory } from '@/lib/aggregate';
import { yDomainFor } from '@/lib/domains';
import { LineChart } from '@/components/chart/LineChart';
import { BrushSummary } from '@/components/chart/BrushSummary';
import { DataTable } from '@/features/percent-by-category/DataTable';
import styles from '@/features/percent-by-category/percentByCategory.module.css';

export interface PercentByCategoryChartProps {
  /** Defaults to the project dataset; injectable so tests can drive it with a fixture. */
  records?: UserRecord[];
}

/**
 * The composition root for the feature. It owns the aggregation and the brush selection, so every
 * view below it reads the same derived numbers — and so the summary can filter the main chart
 * without the two charts talking to each other.
 */
export function PercentByCategoryChart({ records = userRecords }: PercentByCategoryChartProps) {
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const points = useMemo(() => aggregateByCategory(records), [records]);
  const grandTotal = useMemo(() => d3.sum(points, (point) => point.total), [points]);

  const visiblePoints = useMemo(
    () =>
      selection === null
        ? points
        : points.filter(
            (point) => point.category >= selection[0] && point.category <= selection[1],
          ),
    [points, selection],
  );

  const yDomain = useMemo(
    () => yDomainFor(visiblePoints, selection !== null),
    [visiblePoints, selection],
  );

  return (
    <section className={styles.card} aria-labelledby="percent-by-category-heading">
      <h2 id="percent-by-category-heading" className={styles.heading}>
        Percent value by category
      </h2>
      <p className={styles.caption}>
        {grandTotal} total value from {records.length} users across {points.length} categories.
        {selection === null
          ? ''
          : ` Filtered to ${visiblePoints.length} of ${points.length}; the table below stays complete.`}
      </p>
      <LineChart points={visiblePoints} xDomain={selection ?? undefined} yDomain={yDomain} />
      <BrushSummary points={points} selection={selection} onSelect={setSelection} />
      <DataTable points={points} />
    </section>
  );
}
