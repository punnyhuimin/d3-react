import * as d3 from 'd3';
import type { CategoryPoint } from '@/lib/aggregate';

/**
 * One slot on the X axis. `percent` is `null` for a category the dataset has no records for, which
 * is what `d3.line().defined()` reads to break the line rather than bridging across the gap.
 */
export interface DisplayPoint {
  category: number;
  percent: number | null;
}

/** A run of missing categories, bracketed by the two real points either side of it. */
export interface GapSegment {
  from: CategoryPoint;
  to: CategoryPoint;
  /** The categories with no records, e.g. `[12, 13]`. Never empty. */
  missing: number[];
}

function categoryExtent(points: CategoryPoint[]): [number, number] | null {
  const [min, max] = d3.extent(points, (point) => point.category);
  return min === undefined || max === undefined ? null : [min, max];
}

function ascendingByCategory(points: CategoryPoint[]): CategoryPoint[] {
  return [...points].sort((a, b) => d3.ascending(a.category, b.category));
}

/**
 * The categories that fall inside the observed range but carry no records. Detected from the data —
 * nothing here is authored.
 */
export function findMissingCategories(points: CategoryPoint[]): number[] {
  const extent = categoryExtent(points);
  if (extent === null) {
    return [];
  }
  const [min, max] = extent;
  const observed = new Set(points.map((point) => point.category));
  return d3.range(min, max + 1).filter((category) => !observed.has(category));
}

/**
 * The render-time series: every integer in the observed range, in order, carrying a `null` percent
 * where the category is missing.
 */
export function buildDisplaySeries(points: CategoryPoint[]): DisplayPoint[] {
  const extent = categoryExtent(points);
  if (extent === null) {
    return [];
  }
  const [min, max] = extent;
  const byCategory = new Map(points.map((point) => [point.category, point]));
  return d3.range(min, max + 1).map((category) => ({
    category,
    percent: byCategory.get(category)?.percent ?? null,
  }));
}

/**
 * One entry per gap, so the dashed bridge is drawn and labelled per gap instead of assuming there is
 * exactly one. Each segment spans only the missing stretch, so nothing is overdrawn beneath the
 * solid line.
 */
export function buildGapSegments(points: CategoryPoint[]): GapSegment[] {
  const ordered = ascendingByCategory(points);
  const segments: GapSegment[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1];
    const to = ordered[index];
    if (from === undefined || to === undefined) {
      continue;
    }
    const missing = d3.range(from.category + 1, to.category);
    if (missing.length > 0) {
      segments.push({ from, to, missing });
    }
  }

  return segments;
}
