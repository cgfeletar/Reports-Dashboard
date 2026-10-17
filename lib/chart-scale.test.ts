import { describe, expect, it } from "vitest";
import { PERCENT_TICKS, niceCeil, niceTicks } from "./chart-scale";

describe("niceTicks / niceCeil", () => {
  it.each([0.5, 3, 7, 42, 100, 128_307, 1_900_000])("gives 5 evenly spaced ticks for max %s", (max) => {
    const ticks = niceTicks(max);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBe(0);
    const step = ticks[1]!;
    ticks.forEach((t, i) => expect(t).toBeCloseTo(step * i, 9));
    expect(ticks[4]).toBe(niceCeil(max));
  });

  it.each([0.5, 3, 7, 42, 100, 128_307, 1_900_000])("leaves at least ~12%% headroom for max %s", (max) => {
    expect(niceCeil(max)).toBeGreaterThanOrEqual(max * 1.12 - 1e-9);
  });

  it("does not overshoot absurdly", () => {
    expect(niceCeil(128_307)).toBeLessThanOrEqual(128_307 * 1.12 * 1.34);
  });

  it("handles a max of 0, negatives and non-finite values", () => {
    expect(niceTicks(0)).toEqual([0, 1, 2, 3, 4]);
    expect(niceCeil(0)).toBe(4);
    expect(niceCeil(-5)).toBe(4);
    expect(niceCeil(Number.NaN)).toBe(4);
    expect(niceCeil(Number.POSITIVE_INFINITY)).toBe(4);
  });

  it("returns whole-number ticks with the integer option", () => {
    for (const max of [1, 2, 3, 7, 13, 29, 74, 227]) {
      const ticks = niceTicks(max, { integer: true });
      expect(ticks.every(Number.isInteger)).toBe(true);
      expect(ticks[4]).toBeGreaterThanOrEqual(max);
    }
    expect(niceTicks(7, { integer: true })).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0.2, { integer: true })).toEqual([0, 1, 2, 3, 4]);
  });

  it("can use fractional steps for small non-integer maxima", () => {
    expect(niceTicks(0.9)).toEqual([0, 0.3, 0.6, 0.9, 1.2]);
  });

  it("exposes fixed percent ticks", () => {
    expect(PERCENT_TICKS).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
