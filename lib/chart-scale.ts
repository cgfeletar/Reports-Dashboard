/**
 * Y-axis scale: always `[0, niceCeil(max)]` with 5 explicit, evenly spaced
 * ticks. Recharts' own "nice" domain can produce lopsided `$15k / $12k / $8k`
 * axes or clip the top bar label; explicit ticks avoid both.
 */

const STEP_MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const TICK_COUNT = 4; // intervals → 5 tick values
const HEADROOM = 1.12;

export interface ScaleOptions {
  /** Only whole-number steps (unit counts). */
  integer?: boolean;
}

/** Clean up float noise like 0.30000000000000004. */
const tidy = (n: number) => Number(n.toPrecision(12));

function niceStep(max: number, { integer = false }: ScaleOptions = {}): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const raw = (max * HEADROOM) / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const multiplier of STEP_MULTIPLIERS) {
    const step = tidy(multiplier * magnitude);
    if (integer && !Number.isInteger(step)) continue;
    if (step >= raw) return step;
  }
  // Integer mode with a sub-1 raw step (tiny maxima): the smallest whole step is 1.
  return integer ? 1 : tidy(10 * magnitude);
}

/**
 * Rounds `max` up to a value that splits into 4 equal "nice" steps
 * (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × 10ⁿ) with about 12% headroom.
 */
export function niceCeil(max: number, options?: ScaleOptions): number {
  return tidy(niceStep(max, options) * TICK_COUNT);
}

/** The 5 tick values for `[0, niceCeil(max)]`. */
export function niceTicks(max: number, options?: ScaleOptions): number[] {
  const step = niceStep(max, options);
  return Array.from({ length: TICK_COUNT + 1 }, (_, i) => tidy(step * i));
}

/** Fixed axis for rates (fractions): 0–100%. */
export const PERCENT_TICKS = [0, 0.25, 0.5, 0.75, 1];
