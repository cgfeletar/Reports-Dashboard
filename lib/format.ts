/**
 * Every number and month label on the page goes through here, so the whole
 * dashboard formats consistently.
 */
import type { MonthKey } from "./reports-types";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currencyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const count = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// ── Months ───────────────────────────────────────────────────────────────────
// Split "YYYY-MM" by hand: `new Date("YYYY-MM")` is UTC and shifts across timezones.

function parseMonth(month: MonthKey): { year: number; index: number } {
  const [year, mm] = month.split("-").map(Number);
  return { year: year ?? 0, index: (mm ?? 1) - 1 };
}

/** `"2025-10"` → `"Oct"` */
export function formatMonthShort(month: MonthKey): string {
  return MONTHS_SHORT[parseMonth(month).index] ?? month;
}

/** `"2025-10"` → `"October 2025"` */
export function formatMonthLong(month: MonthKey): string {
  const { year, index } = parseMonth(month);
  const name = MONTHS_LONG[index];
  return name ? `${name} ${year}` : month;
}

/** `"2025-10"` → `"Oct '25"` */
export function formatMonthWithYear(month: MonthKey): string {
  const { year } = parseMonth(month);
  return `${formatMonthShort(month)} '${String(year).slice(-2)}`;
}

/**
 * X-axis tick label: short month, with the year on the first tick and on
 * every January so the reader always knows which year they're in.
 */
export function formatMonthTick(month: MonthKey, index: number): string {
  return index === 0 || parseMonth(month).index === 0 ? formatMonthWithYear(month) : formatMonthShort(month);
}

// ── Money and counts ─────────────────────────────────────────────────────────

/** Tooltips and tables: `$128,307.60`. */
export function formatCurrency(value: number): string {
  return currencyFull.format(value);
}

/** Lists and tiles: `$12,294`. */
export function formatCurrencyWhole(value: number): string {
  return currencyWhole.format(value);
}

/**
 * Ticks and bar labels: `$128k`, `$1.4k`, `$8k` (never `$8.0k`), `$950`, `$1.2M`.
 * Rounds first, then picks decimals, so `$9,960` reads `$10k`, not `$10.0k`.
 */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  // A value that rounds to $0 must not read "-$0".
  const sign = value < 0 && Math.round(abs) > 0 ? "-" : "";

  const scaled = (n: number, suffix: string) => {
    const oneDecimal = Math.round(n * 10) / 10;
    if (oneDecimal >= 10) return `${sign}$${Math.round(n)}${suffix}`;
    return `${sign}$${Number.isInteger(oneDecimal) ? oneDecimal : oneDecimal.toFixed(1)}${suffix}`;
  };

  if (Math.round(abs) < 1000) return `${sign}$${Math.round(abs)}`;
  if (Math.round(abs / 1000) < 1000) return scaled(abs / 1000, "k");
  return scaled(abs / 1_000_000, "M");
}

// ── People ───────────────────────────────────────────────────────────────────

/**
 * First name + last initial, for display only: `"Ava Lindqvist"` → `"Ava L."`.
 * Single-word names are returned as is.
 */
export function formatProviderName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/** `1,234` */
export function formatCount(value: number): string {
  return count.format(value);
}

/** A fraction (0–1) as a percentage: `0.823` → `"82%"`. */
export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

// ── Change vs. last month ────────────────────────────────────────────────────

export type ChangeKind = "relative" | "points";
export type ChangeDirection = "up" | "down" | "flat";

export interface Change {
  direction: ChangeDirection;
  /** e.g. `"▲ +12%"`, `"▼ -8%"`, `"▬ 0%"`, `"▲ +2.1 pts"` */
  text: string;
}

const ARROWS: Record<ChangeDirection, string> = { up: "▲", down: "▼", flat: "▬" };

/**
 * Change from `previous` to `current`.
 * - `"relative"`: percent change of the value (`▲ +12%`).
 * - `"points"`: for rates (fractions 0–1), the difference in percentage points (`▲ +2.1 pts`).
 *
 * "Flat" is decided from the rounded value, so `▲ +0%` never appears.
 * Returns `null` when either side is unknown, or for a relative change from 0.
 */
export function formatChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  kind: ChangeKind = "relative",
): Change | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return null;

  let rounded: number;
  let unit: string;
  if (kind === "points") {
    rounded = Math.round((current - previous) * 1000) / 10;
    unit = " pts";
  } else {
    if (previous === 0) return null;
    rounded = Math.round(((current - previous) / Math.abs(previous)) * 100);
    unit = "%";
  }

  if (rounded === 0) return { direction: "flat", text: `${ARROWS.flat} 0${unit}` };
  const direction: ChangeDirection = rounded > 0 ? "up" : "down";
  const magnitude = kind === "points" ? Math.abs(rounded).toFixed(1) : String(Math.abs(rounded));
  return { direction, text: `${ARROWS[direction]} ${rounded > 0 ? "+" : "-"}${magnitude}${unit}` };
}
