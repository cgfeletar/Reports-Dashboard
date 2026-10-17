"use client";

import { useId, useState } from "react";

export interface DataTable {
  caption?: string;
  columns: string[];
  /** Pre-formatted strings; the first cell of each row is the row header. */
  rows: string[][];
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  caption?: string;
  table: DataTable;
  children: React.ReactNode;
  className?: string;
}

/**
 * ChartCard
 * Classification: WRITE NEW (spec §6, §7)
 * The table is always rendered and toggled with `hidden` so aria-controls always
 * points at a real element.
 */
export function ChartCard({ title, subtitle, caption, table, children, className }: ChartCardProps): React.JSX.Element {
  const [showData, setShowData] = useState(false);
  const tableId = useId();

  return (
    <figure
      className={`m-0 min-w-0 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--card-shadow)] max-xs:p-4 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[19px] font-medium leading-snug text-ink">{title}</h3>
          {subtitle ? <p className="mt-1 text-[13px] font-light text-ink-soft">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          aria-expanded={showData}
          aria-controls={tableId}
          onClick={() => setShowData((v) => !v)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3.5 text-xs font-medium text-accent-deep transition-colors hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span>
            {showData ? "Hide data" : "View data"}{" "}
            <span className="sr-only">for {title}</span>
          </span>
        </button>
      </div>

      <div className="mt-4">{children}</div>

      <div id={tableId} hidden={!showData} className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px] tabular-nums">
          {table.caption ? <caption className="pb-2 text-left text-xs text-ink-soft">{table.caption}</caption> : null}
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th key={col} scope="col" className="whitespace-nowrap border-b border-line px-2 py-2 font-medium text-ink-soft">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="whitespace-nowrap border-b border-line px-2 py-2 font-medium text-ink">
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className="whitespace-nowrap border-b border-line px-2 py-2 text-ink">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="mt-4 text-xs font-light leading-relaxed text-ink-soft">{caption ?? subtitle ?? title}</figcaption>
    </figure>
  );
}
