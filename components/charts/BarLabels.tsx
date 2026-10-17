"use client";

import type { ReactElement } from "react";
import { INK, INK_SOFT } from "@/lib/chart-theme";
import type { MonthKey } from "@/lib/reports-types";
import type { MonthRow, ValueKind } from "./types";
import { cellValue, formatCompact, isSelected } from "./shared";

interface LabelContentProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  index?: number;
}

export interface BarLabelOptions {
  data: readonly MonthRow[];
  valueKey: string;
  valueKind: ValueKind;
  selectedMonth: MonthKey;
  /** Row key holding unit counts; adds a second `(14)` line under the value. */
  unitsKey?: string;
  fontSize?: number;
  /** Drop non-selected labels (measured slot too narrow). */
  hideSecondary?: boolean;
}

const LIFT = 6;

/**
 * LabelList `content` renderer. Recharts 3 passes no payload, so the row is
 * looked up by `index`; `y` is the top of the bar, so text is lifted above it.
 */
export function barLabelContent({
  data,
  valueKey,
  valueKind,
  selectedMonth,
  unitsKey,
  fontSize = 11,
  hideSecondary = false,
}: BarLabelOptions) {
  return function BarLabel({ x, y, width, index }: LabelContentProps): ReactElement | null {
    const row = index === undefined ? undefined : data[index];
    const value = cellValue(row, valueKey);
    if (!row || !value) return null;
    const left = Number(x);
    const top = Number(y);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;

    const units = unitsKey ? cellValue(row, unitsKey) : null;
    const selected = isSelected(row, selectedMonth);
    if (!selected && hideSecondary) return null;
    const lineHeight = fontSize + 1;
    return (
      <text
        className={selected ? undefined : "chart-label-secondary"}
        x={left + Number(width) / 2}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={selected ? 600 : 400}
        fill={selected ? INK : INK_SOFT}
      >
        <tspan x={left + Number(width) / 2} y={top - LIFT - (units === null ? 0 : lineHeight)}>
          {formatCompact(value, valueKind)}
        </tspan>
        {units !== null && (
          <tspan x={left + Number(width) / 2} y={top - LIFT} fontWeight={400} fill={INK_SOFT}>
            {`(${units})`}
          </tspan>
        )}
      </text>
    );
  };
}
