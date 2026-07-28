import * as d3 from 'd3';
import type { CategoryPoint } from '@/lib/aggregate';

/**
 * The point closest to a category position, which is what makes the crosshair sticky: the reader
 * aims at a region, never at a 2px line. Searches the **real** points only, so a position inside a
 * gap snaps to one of the points bracketing it rather than floating over an absence.
 *
 * Ties — an exact midpoint between two points — resolve to the lower category, so a pointer sitting
 * still never flickers between two readings.
 */
export function nearestPoint(points: CategoryPoint[], category: number): CategoryPoint | null {
  if (points.length === 0 || !Number.isFinite(category)) {
    return null;
  }

  const distance = (point: CategoryPoint) => Math.abs(point.category - category);

  return (
    d3.least(
      points,
      (a, b) => d3.ascending(distance(a), distance(b)) || d3.ascending(a.category, b.category),
    ) ?? null
  );
}
