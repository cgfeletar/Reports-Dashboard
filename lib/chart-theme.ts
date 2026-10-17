/**
 * The only place chart colors live. Components import from here; no hex
 * values anywhere else in components.
 *
 * The categorical palette is validated for color-blind separation in this
 * fixed order. Assign by rank and never cycle: anything past the sixth series
 * is grouped into "Other". Adjacent hues sit in the warning band for some
 * color-vision types, so a secondary encoding is required too: a legend for
 * 2+ series, 2px white strokes between stacked segments and donut slices, and
 * direct labels where specified.
 */

export const CATEGORICAL = [
  "#4a7d3c", // green
  "#b8841c", // ochre
  "#7a5296", // plum
  "#c25a3c", // terracotta
  "#2f7fb8", // slate blue
  "#c96a92", // rose
] as const;

/** Reserved for the "Other" bucket only. */
export const OTHER_COLOR = "#b6b2a8";
export const OTHER_LABEL = "Other";

/** Single-series charts. */
export const SINGLE_SERIES = "#5b6a56";

/** Mirrors the CSS tokens in `app/globals.css` for SVG attributes, which can't read CSS variables. */
export const INK = "#1a1a1a";
export const INK_SOFT = "#6b6b6b";
export const LINE = "#ece9e3";
export const SEGMENT_STROKE = "#ffffff";

export const BAR_MAX_SIZE = 36;
export const BAR_RADIUS = 4;
/** Months other than the selected one. */
export const DIM_OPACITY = 0.6;
export const LINE_STROKE_WIDTH = 2;
export const DOT_RADIUS = 4;

export const AXIS_TICK = { fontSize: 11, fill: INK_SOFT } as const;

/** Color for the series at `rank` (0-based) of a fixed top-N ranking. */
export function categoricalColor(rank: number): string {
  return CATEGORICAL[rank] ?? OTHER_COLOR;
}
