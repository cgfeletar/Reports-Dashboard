import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatCount,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyWhole,
  formatMonthLong,
  formatMonthShort,
  formatMonthTick,
  formatMonthWithYear,
  formatPercent,
} from "./format";

describe("month labels", () => {
  it("formats without any Date/timezone shift", () => {
    expect(formatMonthShort("2025-10")).toBe("Oct");
    expect(formatMonthShort("2026-01")).toBe("Jan");
    expect(formatMonthShort("2026-12")).toBe("Dec");
    expect(formatMonthLong("2026-01")).toBe("January 2026");
    expect(formatMonthWithYear("2026-01")).toBe("Jan '26");
  });

  it("falls back to the raw key for invalid months", () => {
    expect(formatMonthShort("2026-13")).toBe("2026-13");
    expect(formatMonthLong("2026-00")).toBe("2026-00");
  });

  it("puts the year on the first tick and on every January", () => {
    expect(formatMonthTick("2025-10", 0)).toBe("Oct '25");
    expect(formatMonthTick("2025-11", 1)).toBe("Nov");
    expect(formatMonthTick("2026-01", 3)).toBe("Jan '26");
  });
});

describe("formatCurrency*", () => {
  it("formats full and whole dollars", () => {
    expect(formatCurrency(128307.6)).toBe("$128,307.60");
    expect(formatCurrencyWhole(12294.4)).toBe("$12,294");
    expect(formatCount(1234.6)).toBe("1,235");
  });

  it("compacts to k/M with minimal decimals", () => {
    expect(formatCurrencyCompact(128307)).toBe("$128k");
    expect(formatCurrencyCompact(1400)).toBe("$1.4k");
    expect(formatCurrencyCompact(8000)).toBe("$8k");
    expect(formatCurrencyCompact(8040)).toBe("$8k");
    expect(formatCurrencyCompact(9960)).toBe("$10k");
    expect(formatCurrencyCompact(999_600)).toBe("$1M");
    expect(formatCurrencyCompact(1_240_000)).toBe("$1.2M");
  });

  it("leaves values under 1000 whole", () => {
    expect(formatCurrencyCompact(0)).toBe("$0");
    expect(formatCurrencyCompact(950)).toBe("$950");
    expect(formatCurrencyCompact(999.4)).toBe("$999");
    expect(formatCurrencyCompact(999.5)).toBe("$1k");
  });

  it("handles negatives", () => {
    expect(formatCurrencyCompact(-1400)).toBe("-$1.4k");
    expect(formatCurrencyCompact(-950)).toBe("-$950");
    expect(formatCurrencyCompact(-0.2)).toBe("$0");
  });
});

describe("formatPercent", () => {
  it("formats fractions", () => {
    expect(formatPercent(0.823)).toBe("82%");
    expect(formatPercent(0.4725, 1)).toBe("47.3%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatChange", () => {
  it("formats relative changes with arrow and sign", () => {
    expect(formatChange(112, 100)).toEqual({ direction: "up", text: "▲ +12%" });
    expect(formatChange(92, 100)).toEqual({ direction: "down", text: "▼ -8%" });
  });

  it("is flat when the rounded change is zero", () => {
    expect(formatChange(100.4, 100)).toEqual({ direction: "flat", text: "▬ 0%" });
    expect(formatChange(99.6, 100)).toEqual({ direction: "flat", text: "▬ 0%" });
    expect(formatChange(100, 100)?.text).toBe("▬ 0%");
  });

  it("formats points for rates", () => {
    expect(formatChange(0.521, 0.5, "points")).toEqual({ direction: "up", text: "▲ +2.1 pts" });
    expect(formatChange(0.479, 0.5, "points")).toEqual({ direction: "down", text: "▼ -2.1 pts" });
    expect(formatChange(0.5004, 0.5, "points")).toEqual({ direction: "flat", text: "▬ 0 pts" });
  });

  it("returns null for unknown sides and relative change from zero", () => {
    expect(formatChange(null, 5)).toBeNull();
    expect(formatChange(5, null)).toBeNull();
    expect(formatChange(undefined, 5)).toBeNull();
    expect(formatChange(Number.NaN, 5)).toBeNull();
    expect(formatChange(5, 0)).toBeNull();
    expect(formatChange(0.1, 0, "points")).toEqual({ direction: "up", text: "▲ +10.0 pts" });
  });

  it("uses the magnitude of a negative previous value", () => {
    expect(formatChange(-50, -100)).toEqual({ direction: "up", text: "▲ +50%" });
  });
});
