import * as d3 from 'd3';
import type { CategoryPoint } from '@/lib/aggregate';
import type { DisplayPoint } from '@/lib/missingData';

/** The brief's default reading: the full percentage scale, so every share is judged against 100%. */
export const DEFAULT_Y_DOMAIN: [number, number] = [0, 100];

/** Shared by the scale's `.nice()` and the axis's `.ticks()`, so the two can never disagree. */
export const Y_TICK_COUNT = 10;

/** Breathing room above and below a filtered slice, as a share of its own span. */
const PADDING_RATIO = 0.1;

/**
 * The X domain a series should be plotted across: its own observed extent. Returns `null` for an
 * empty series, so the caller decides what an empty view looks like rather than getting a domain
 * that cannot be drawn. A lone category is widened, since a zero-width domain has no scale.
 */
export function xDomainFor(series: DisplayPoint[]): [number, number] | null {
  const first = series[0];
  const last = series.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  return first.category === last.category
    ? [first.category - 0.5, last.category + 0.5]
    : [first.category, last.category];
}

/**
 * The Y domain the main chart should read against.
 *
 * Unfiltered it is the flat 0–100%. Brushing zooms to the selection's own extent —
 * the only reading under which filtering on the Y axis means anything — padded and `.nice()`d so
 * the ticks are always rounded to the nearest whole number. A filter that has no data set has no extent
 * to zoom to, and a single point has a span of zero, which would collapse the axis onto the
 * point. Both fall back to something readable rather than producing an unrenderable domain.
 */
export function yDomainFor(points: CategoryPoint[], isFiltered: boolean): [number, number] {
  if (!isFiltered) {
    return DEFAULT_Y_DOMAIN;
  }

  const [min, max] = d3.extent(points, (point) => point.percent);
  if (min === undefined || max === undefined) {
    return DEFAULT_Y_DOMAIN;
  }

  // A lone point has no span of its own, so borrow a scale from its own magnitude.
  const padding = max === min ? Math.max(Math.abs(max) * 0.5, 1) : (max - min) * PADDING_RATIO;

  const [low, high] = d3
    .scaleLinear()
    .domain([Math.max(min - padding, 0), max + padding])
    .nice(Y_TICK_COUNT)
    .domain();

  if (low === undefined || high === undefined || low === high) {
    return DEFAULT_Y_DOMAIN;
  }
  return [low, high];
}
