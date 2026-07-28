import * as d3 from 'd3';
import { userRecords } from '@/data/users';
import { aggregateByCategory, formatPercent } from '@/lib/aggregate';

const points = aggregateByCategory(userRecords);

describe('aggregateByCategory', () => {
  it('returns categories in strictly ascending order', () => {
    const categories = points.map((point) => point.category);
    expect(categories).toEqual([...categories].sort(d3.ascending));
    expect(new Set(categories).size).toBe(categories.length);
  });

  it('places every input user in exactly one group', () => {
    const grouped = points.flatMap((point) => point.users);
    expect(grouped.slice().sort()).toEqual(userRecords.map((record) => record.user).sort());
    expect(new Set(grouped).size).toBe(userRecords.length);
  });

  it("gives each group the sum of that category's own records", () => {
    for (const point of points) {
      const own = userRecords.filter((record) => record.category === point.category);
      expect(point.total).toBe(d3.sum(own, (record) => record.value));
      expect(point.users).toHaveLength(own.length);
    }
  });

  it('produces percentages that sum to 100', () => {
    expect(d3.sum(points, (point) => point.percent)).toBeCloseTo(100, 10);
  });

  it('shares out the grand total in proportion to each group', () => {
    const grandTotal = d3.sum(userRecords, (record) => record.value);
    for (const point of points) {
      expect(point.percent).toBeCloseTo((point.total / grandTotal) * 100, 10);
    }
  });

  it('comma-joins the names of a category holding more than one user', () => {
    const merged = points.find((point) => point.users.length > 1);
    expect(merged).toBeDefined();
    expect(merged?.label).toBe(merged?.users.join(', '));
    expect(merged?.label).toContain(', ');
  });

  it('labels a single-user category with just that name', () => {
    const solo = points.find((point) => point.users.length === 1);
    expect(solo).toBeDefined();
    expect(solo?.label).toBe(solo?.users[0]);
  });

  it('returns nothing for no records', () => {
    expect(aggregateByCategory([])).toEqual([]);
  });
});

describe('formatPercent', () => {
  it('trims a whole number to no decimals for axis ticks', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(100)).toBe('100%');
  });

  it('keeps one decimal for a fractional readout', () => {
    expect(formatPercent(22.556390977)).toBe('22.6%');
  });
});
