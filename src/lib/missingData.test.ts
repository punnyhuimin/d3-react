import * as d3 from 'd3';
import { userRecords } from '@/data/users';
import { aggregateByCategory, type CategoryPoint } from '@/lib/aggregate';
import { buildDisplaySeries, buildGapSegments, findMissingCategories } from '@/lib/missingData';

const points = aggregateByCategory(userRecords);

/** A minimal point, so a fixture describes only the shape under test: which categories exist. */
function pointAt(category: number, percent = 10): CategoryPoint {
  return { category, users: [`u${category}`], label: `u${category}`, total: percent, percent };
}

const contiguous = [pointAt(1), pointAt(2), pointAt(3)];
const twoGaps = [pointAt(1), pointAt(4), pointAt(5), pointAt(9)];

describe('findMissingCategories', () => {
  it('finds the categories the real dataset skips', () => {
    const missing = findMissingCategories(points);
    const observed = new Set(userRecords.map((record) => record.category));

    expect(missing.length).toBeGreaterThan(0);
    for (const category of missing) {
      expect(observed.has(category)).toBe(false);
    }
  });

  it('stays inside the observed range and covers every integer in it', () => {
    const missing = findMissingCategories(points);
    const [min, max] = d3.extent(points, (point) => point.category);
    const covered = [...points.map((point) => point.category), ...missing].sort(d3.ascending);

    expect(covered).toEqual(d3.range(min ?? 0, (max ?? 0) + 1));
  });

  it('finds nothing in a contiguous run', () => {
    expect(findMissingCategories(contiguous)).toEqual([]);
  });

  it('finds every missing integer across separate gaps', () => {
    expect(findMissingCategories(twoGaps)).toEqual([2, 3, 6, 7, 8]);
  });

  it('handles a single point and no points at all', () => {
    expect(findMissingCategories([pointAt(4)])).toEqual([]);
    expect(findMissingCategories([])).toEqual([]);
  });
});

describe('buildDisplaySeries', () => {
  it('emits every integer in the observed range in ascending order', () => {
    const series = buildDisplaySeries(points);
    const [min, max] = d3.extent(points, (point) => point.category);

    expect(series.map((slot) => slot.category)).toEqual(d3.range(min ?? 0, (max ?? 0) + 1));
  });

  it('nulls the percent of a missing category and keeps the real ones', () => {
    const series = buildDisplaySeries(points);
    const missing = new Set(findMissingCategories(points));

    for (const slot of series) {
      if (missing.has(slot.category)) {
        expect(slot.percent).toBeNull();
      } else {
        const source = points.find((point) => point.category === slot.category);
        expect(slot.percent).toBe(source?.percent);
      }
    }
  });

  it('breaks at each gap of a two-gap fixture', () => {
    expect(buildDisplaySeries(twoGaps)).toEqual([
      { category: 1, percent: 10 },
      { category: 2, percent: null },
      { category: 3, percent: null },
      { category: 4, percent: 10 },
      { category: 5, percent: 10 },
      { category: 6, percent: null },
      { category: 7, percent: null },
      { category: 8, percent: null },
      { category: 9, percent: 10 },
    ]);
  });

  it('handles a single point and no points at all', () => {
    expect(buildDisplaySeries([pointAt(4)])).toEqual([{ category: 4, percent: 10 }]);
    expect(buildDisplaySeries([])).toEqual([]);
  });
});

describe('buildGapSegments', () => {
  it('brackets each gap in the real dataset with its neighbouring points', () => {
    const segments = buildGapSegments(points);
    const missing = findMissingCategories(points);

    expect(segments.length).toBeGreaterThan(0);
    expect(segments.flatMap((segment) => segment.missing)).toEqual(missing);

    for (const segment of segments) {
      expect(points).toContain(segment.from);
      expect(points).toContain(segment.to);
      expect(segment.from.category).toBe((segment.missing[0] ?? NaN) - 1);
      expect(segment.to.category).toBe((segment.missing.at(-1) ?? NaN) + 1);
    }
  });

  it('returns one segment per gap, not one for the whole series', () => {
    const segments = buildGapSegments(twoGaps);

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.missing)).toEqual([
      [2, 3],
      [6, 7, 8],
    ]);
    expect(segments.map((segment) => [segment.from.category, segment.to.category])).toEqual([
      [1, 4],
      [5, 9],
    ]);
  });

  it('returns nothing for a contiguous run', () => {
    expect(buildGapSegments(contiguous)).toEqual([]);
  });

  it('handles a single point and no points at all', () => {
    expect(buildGapSegments([pointAt(4)])).toEqual([]);
    expect(buildGapSegments([])).toEqual([]);
  });

  it('orders unsorted input before pairing brackets', () => {
    expect(buildGapSegments([pointAt(5), pointAt(1)])).toEqual([
      { from: pointAt(1), to: pointAt(5), missing: [2, 3, 4] },
    ]);
  });
});
