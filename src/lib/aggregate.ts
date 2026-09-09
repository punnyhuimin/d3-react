import * as d3 from 'd3';
import type { UserRecord } from '@/data/users';

/** One plotted point: a category, everyone in it, and its share of the grand total. */
export interface CategoryPoint {
  category: number;
  users: string[];
  /** The category's user names merged for display, e.g. `'cB0hC, Rm6vnmNPRvz'`. */
  label: string;
  total: number;
  /** Percentage of the grand total, on a 0–100 scale. */
  percent: number;
}

const percentFormat = d3.format('.1~f');

/**
 * Formats a percentage on a 0–100 scale for display.
 */
export function formatPercent(percent: number): string {
  return `${percentFormat(percent)}%`;
}

/**
 * Groups the raw records by category and computes each category's share of the grand total.
 * Categories come back in ascending order to plot against a linear X axis.
 */
export function aggregateByCategory(records: UserRecord[]): CategoryPoint[] {
  const grandTotal = d3.sum(records, (record) => record.value);

  const grouped = d3.rollups(
    records,
    (group) => ({
      users: group.map((record) => record.user),
      total: d3.sum(group, (record) => record.value),
    }),
    (record) => record.category,
  );
  return grouped
    .sort(([a], [b]) => d3.ascending(a, b))
    .map(([category, { users, total }]) => ({
      category,
      users,
      label: Array.from(new Set(users)).join(', '),
      total,
      percent: grandTotal === 0 ? 0 : (total / grandTotal) * 100,
    }));
}
