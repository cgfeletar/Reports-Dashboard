import type { MonthRow, Series } from "./types";

/** `MonthRow`'s intersection type can't be built from a literal; cast once here. */
export const row = (month: string, values: Record<string, number | null>): MonthRow =>
  ({ month, ...values }) as unknown as MonthRow;

export const MONTHS = [
  row("2025-10", { a: 100, b: 50, u: 4 }),
  row("2025-11", { a: 0, b: 80, u: 0 }),
  row("2025-12", { a: 250, b: null, u: 9 }),
];

export const SERIES: Series[] = [
  { key: "a", name: "Alpha", color: "#111111" },
  { key: "b", name: "Beta", color: "#222222" },
];
