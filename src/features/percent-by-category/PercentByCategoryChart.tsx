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
    <div>
      <section className={styles.card}>
        <p className={styles.caption}>
          {grandTotal} total value from {records.length} users across {points.length} categories.
          {selection === null
            ? ''
            : ` ${visiblePoints.length} of ${points.length} categories visible on the chart.`}
        </p>
        <LineChart points={visiblePoints} xDomain={selection ?? undefined} yDomain={yDomain} />
        <BrushSummary points={points} selection={selection} onSelect={setSelection} />
        <br />
      </section>
      <header className={styles.header}>
        <h2 className={styles.title}>Tabulation of data</h2>
        <p className={styles.caption}>
          The table below is not affected by the brush selection, so it always shows the full
          dataset.
        </p>
        <br />
      </header>
      <section className={styles.card}>
        <DataTable points={points} />
      </section>
    </div>
  );
}
