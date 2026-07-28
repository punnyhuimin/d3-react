import { useMemo } from 'react';
import * as d3 from 'd3';
import { userRecords, type UserRecord } from '@/data/users';
import { aggregateByCategory } from '@/lib/aggregate';
import { LineChart } from '@/components/chart/LineChart';
import { DataTable } from '@/features/percent-by-category/DataTable';
import styles from '@/features/percent-by-category/percentByCategory.module.css';

export interface PercentByCategoryChartProps {
  /** Defaults to the project dataset; injectable so tests can drive it with a fixture. */
  records?: UserRecord[];
}

/**
 * The composition root for the feature. It owns the aggregation — and, from Phase 7, the brush
 * selection — so every view below it reads the same derived numbers.
 */
export function PercentByCategoryChart({ records = userRecords }: PercentByCategoryChartProps) {
  const points = useMemo(() => aggregateByCategory(records), [records]);
  const grandTotal = useMemo(() => d3.sum(points, (point) => point.total), [points]);

  return (
    <section className={styles.card} aria-labelledby="percent-by-category-heading">
      <h2 id="percent-by-category-heading" className={styles.heading}>
        Percent value by category
      </h2>
      <p className={styles.caption}>
        {grandTotal} total value from {records.length} users across {points.length} categories.
      </p>
      <LineChart points={points} />
      <DataTable points={points} />
    </section>
  );
}
