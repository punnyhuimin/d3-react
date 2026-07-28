/**
 * Geometry the two charts must agree on. The summary's plot area lines up exactly under the main
 * chart's, which is what makes a brushed X range mean the same thing in both — so the horizontal
 * margins live here rather than being written twice.
 */

const HORIZONTAL = { left: 52, right: 24 };

/** Room at the foot for the category axis, and at the top for the highest gridline label. */
export const MAIN_MARGIN = { ...HORIZONTAL, top: 16, bottom: 36 };

/** The summary carries no axis, so it needs only enough room for the brush handles. */
export const SUMMARY_MARGIN = { ...HORIZONTAL, top: 8, bottom: 8 };

/** Used until a container reports a width, and permanently where `ResizeObserver` is absent. */
export const FALLBACK_WIDTH = 640;
