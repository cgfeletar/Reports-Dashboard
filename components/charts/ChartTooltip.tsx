"use client";

import type { ReactElement } from "react";
import { formatMonthLong } from "@/lib/format";
import type { MonthRow, ValueKind } from "./types";
import { formatFull } from "./shared";

/** Structurally compatible with Recharts' tooltip payload entries. */
export interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  /** Month key, shown as a long month name unless `title` is given. */
  label?: string | number;
  title?: string;
  valueKind: ValueKind;
  /** List rows in reverse of stack order, so they read top to bottom like the bars. */
  reverse?: boolean;
  total?: boolean;
  footer?: (row: MonthRow) => string | null;
}

const EMPTY = "—";

export function ChartTooltip({
  active,
  payload,
  label,
  title,
  valueKind,
  reverse = false,
  total = false,
  footer,
}: ChartTooltipProps): ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  const entries = reverse ? [...payload].reverse() : payload;
  const header = title ?? (typeof label === "string" ? formatMonthLong(label) : String(label ?? ""));
  const numbers = payload.map((e) => (typeof e.value === "number" ? e.value : null));
  const known = numbers.filter((n): n is number => n !== null);
  const footerText = footer ? footer(payload[0]?.payload as MonthRow) : null;

  return (
    <div className="min-w-[150px] rounded-lg border border-line bg-white px-3 py-2.5 text-[12px] leading-snug text-ink shadow-[var(--card-shadow)]">
      <p className="mb-1.5 text-[13px] font-medium">{header}</p>
      <ul className="space-y-1">
        {entries.map((entry, i) => {
          const value = typeof entry.value === "number" ? entry.value : null;
          const color = entry.color ?? entry.fill ?? entry.stroke;
          return (
            <li key={`${String(entry.name)}-${i}`} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
              <span className="text-ink-soft">{String(entry.name ?? "")}</span>
              <span className="ml-auto pl-3 tabular-nums">{value === null ? EMPTY : formatFull(value, valueKind)}</span>
            </li>
          );
        })}
      </ul>
      {total && (
        <p className="mt-1.5 flex border-t border-line pt-1.5 font-medium">
          <span>Total</span>
          <span className="ml-auto pl-3 tabular-nums">
            {known.length === 0
              ? EMPTY
              : `${formatFull(known.reduce((a, b) => a + b, 0), valueKind)}${known.length < numbers.length ? " (partial)" : ""}`}
          </span>
        </p>
      )}
      {footerText && <p className="mt-1.5 text-ink-soft">{footerText}</p>}
    </div>
  );
}
