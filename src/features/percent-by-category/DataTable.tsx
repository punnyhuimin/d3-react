import { formatPercent, type CategoryPoint } from '@/lib/aggregate';
import styles from '@/features/percent-by-category/percentByCategory.module.css';

export interface DataTableProps {
  points: CategoryPoint[];
}
// NOTE: (3.4ms (window rescale) to 4.3ms (brush) re-rendering.
// Memo to prevent re-rendering the table when the brush selection changes,
// which is not relevant to this view. The table always shows the full dataset.
/**
 * View existing data in a table. Does not react to the filter.
 */
export function DataTable({ points }: DataTableProps) {
  // export const DataTable = memo(function DataTable({ points }: DataTableProps) {
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
