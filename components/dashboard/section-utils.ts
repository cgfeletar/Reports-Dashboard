import { formatMonthLong } from "@/lib/format";
import type { DataTable } from "@/components/ui/ChartCard";
import type { MonthRow, Series, SmallMultiplePanel, ValueKind } from "@/components/charts";
import { formatFull } from "@/components/charts";
import type { MonthKey, MonthReport } from "@/lib/reports-types";

export const GAP = "—";

export function cell(value: number | null | undefined, format: (v: number) => string): string {
  return value === null || value === undefined ? GAP : format(value);
}

export function findReport(reports: MonthReport[], month: MonthKey): MonthReport | undefined {
  return reports.find((r) => r.month === month);
}

/** Month-by-series table; gaps read "—", never 0. */
export function seriesTable(rows: MonthRow[], series: Series[], kind: ValueKind, caption?: string): DataTable {
  return {
    caption,
    columns: ["Month", ...series.map((s) => s.name)],
    rows: rows.map((r) => [formatMonthLong(r.month), ...series.map((s) => cell(r[s.key], (v) => formatFull(v, kind)))]),
  };
}

interface PanelLike {
  id: string;
  title: string;
  data: { month: MonthKey }[];
}

/** `MonthRow`'s intersection type rejects plain `{ month, value }` literals; the shapes match at runtime. */
export function toPanels(panels: PanelLike[]): SmallMultiplePanel[] {
  return panels.map((p) => ({ id: p.id, title: p.title, data: p.data as unknown as MonthRow[] }));
}
