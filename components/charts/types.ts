import type { MonthKey } from "@/lib/reports-types";

export type ValueKind = "currency" | "count" | "percent";

/** One row per month; `null` is a gap (unknown), never 0. */
export type MonthRow = { month: MonthKey } & Record<string, number | null>;

export interface Series {
  key: string;
  name: string;
  color: string;
}
