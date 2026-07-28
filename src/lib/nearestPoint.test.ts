import { userRecords } from '@/data/users';
import { aggregateByCategory, type CategoryPoint } from '@/lib/aggregate';
import { findMissingCategories } from '@/lib/missingData';
import { nearestPoint } from '@/lib/nearestPoint';

const points = aggregateByCategory(userRecords);

/** A minimal point, so a fixture describes only the shape under test: which categories exist. */
function pointAt(category: number, percent = 10): CategoryPoint {
  return { category, users: [`u${category}`], label: `u${category}`, total: percent, percent };
}

const spread = [pointAt(1), pointAt(4), pointAt(5), pointAt(9)];

describe('nearestPoint', () => {
  it('returns the point sitting exactly under the position', () => {
    for (const point of points) {
      expect(nearestPoint(points, point.category)).toBe(point);
    }
  });

  it('snaps to the closer of two neighbours', () => {
    expect(nearestPoint(spread, 1.4)?.category).toBe(1);
    expect(nearestPoint(spread, 3.6)?.category).toBe(4);
  });

  it('resolves an exact midpoint to the lower category, so a still pointer never flickers', () => {
    expect(nearestPoint(spread, 2.5)?.category).toBe(1);
    expect(nearestPoint(spread, 7)?.category).toBe(5);
  });

  it('never returns an unsorted input in the wrong tie order', () => {
    expect(nearestPoint([pointAt(9), pointAt(1)], 5)?.category).toBe(1);
  });

  it('clamps a position outside the range to the end points', () => {
    expect(nearestPoint(spread, -50)?.category).toBe(1);
    expect(nearestPoint(spread, 500)?.category).toBe(9);
  });

  it('snaps a position inside a gap to a bracketing point rather than floating', () => {
    const missing = findMissingCategories(points);
    expect(missing.length).toBeGreaterThan(0);

    const observed = new Set(points.map((point) => point.category));
    for (const category of missing) {
      const snapped = nearestPoint(points, category);
      expect(snapped).not.toBeNull();
      expect(observed.has(snapped?.category ?? NaN)).toBe(true);
    }
  });

  it('stays inside the gap brackets, never jumping past them', () => {
    // 2 and 3 are missing from `spread`; both must resolve to 1 or 4, never to 5 or 9.
    expect(nearestPoint(spread, 2)?.category).toBe(1);
    expect(nearestPoint(spread, 3)?.category).toBe(4);
  });

  it('returns null when there is nothing to snap to', () => {
    expect(nearestPoint([], 5)).toBeNull();
    expect(nearestPoint(points, NaN)).toBeNull();
  });
});
