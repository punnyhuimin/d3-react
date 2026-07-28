import { formatPercent, type CategoryPoint } from '@/lib/aggregate';
import styles from '@/features/percent-by-category/percentByCategory.module.css';

export interface DataTableProps {
  points: CategoryPoint[];
}

/**
 * The accessible view of the same numbers the chart plots. Tooltips enhance; they never gate, so the
 * merged user names are permanently visible here rather than only on hover.
 */
export function DataTable({ points }: DataTableProps) {
  return (
    <table className={styles.table}>
      <caption className={styles.visuallyHidden}>
        Each category, the users in it, its total value and its share of the overall total.
      </caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Users</th>
          <th scope="col" className={styles.numeric}>
            Value
          </th>
          <th scope="col" className={styles.numeric}>
            Percent
          </th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.category}>
            <th scope="row">{point.category}</th>
            <td>{point.label}</td>
            <td className={styles.numeric}>{point.total}</td>
            <td className={styles.numeric}>{formatPercent(point.percent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
