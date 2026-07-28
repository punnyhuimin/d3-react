import { userRecords } from '@/data/users';
import { aggregateByCategory, type CategoryPoint } from '@/lib/aggregate';
import { DEFAULT_Y_DOMAIN, yDomainFor } from '@/lib/domains';

const points = aggregateByCategory(userRecords);

/** A minimal point, so a fixture describes only the shape under test: the percents in the slice. */
function pointAt(category: number, percent: number): CategoryPoint {
  return { category, users: [`u${category}`], label: `u${category}`, total: percent, percent };
}

function span([low, high]: [number, number]): number {
  return high - low;
}

describe('yDomainFor', () => {
  it('reads the full 0 to 100 percent scale when nothing is filtered', () => {
    expect(yDomainFor(points, false)).toEqual(DEFAULT_Y_DOMAIN);
    expect(yDomainFor([], false)).toEqual(DEFAULT_Y_DOMAIN);
  });

  it('tightens onto a filtered slice', () => {
    const slice = points.slice(0, 3);
    const domain = yDomainFor(slice, true);

    expect(span(domain)).toBeLessThan(span(DEFAULT_Y_DOMAIN));
    for (const point of slice) {
      expect(point.percent).toBeGreaterThanOrEqual(domain[0]);
      expect(point.percent).toBeLessThanOrEqual(domain[1]);
    }
  });

  it('keeps every visible point inside the domain, for every contiguous slice', () => {
    for (let start = 0; start < points.length; start += 1) {
      for (let end = start + 1; end <= points.length; end += 1) {
        const slice = points.slice(start, end);
        const [low, high] = yDomainFor(slice, true);

        expect(high).toBeGreaterThan(low);
        for (const point of slice) {
          expect(point.percent).toBeGreaterThanOrEqual(low);
          expect(point.percent).toBeLessThanOrEqual(high);
        }
      }
    }
  });

  it('never drops the floor below zero, since a percentage cannot', () => {
    expect(yDomainFor([pointAt(1, 0.4), pointAt(2, 1.1)], true)[0]).toBeGreaterThanOrEqual(0);
  });

  it('falls back to the full scale when the selection is empty', () => {
    expect(yDomainFor([], true)).toEqual(DEFAULT_Y_DOMAIN);
  });

  it('does not collapse onto a single-point selection', () => {
    const domain = yDomainFor([pointAt(7, 22.5)], true);

    expect(domain[1]).toBeGreaterThan(domain[0]);
    expect(22.5).toBeGreaterThanOrEqual(domain[0]);
    expect(22.5).toBeLessThanOrEqual(domain[1]);
  });

  it('does not collapse on a single point sitting at zero', () => {
    const domain = yDomainFor([pointAt(7, 0)], true);

    expect(domain[1]).toBeGreaterThan(domain[0]);
    expect(domain[0]).toBe(0);
  });

  it('produces round tick boundaries rather than raw padded extents', () => {
    const [low, high] = yDomainFor(points.slice(0, 4), true);

    expect(Number.isFinite(low)).toBe(true);
    expect(Number.isFinite(high)).toBe(true);
    // `.nice()` is what keeps the axis labels round; a raw extent would carry the padding decimals.
    expect(Number((high - low).toFixed(10)) % 1).toBe(0);
  });
});
