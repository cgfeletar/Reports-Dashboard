"use client";

import type { ReactElement } from "react";

export interface LegendItem {
  key?: string;
  name: string;
  color: string;
}

export interface ChartLegendProps {
  items: readonly LegendItem[];
  className?: string;
}

export function ChartLegend({ items, className = "" }: ChartLegendProps): ReactElement {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-soft ${className}`}>
      {items.map((item) => (
        <li key={item.key ?? item.name} className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
