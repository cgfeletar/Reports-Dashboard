"use client";

import type { ReactElement } from "react";
import { CartesianGrid } from "recharts";
import type { BarShapeProps } from "recharts";
import { niceTicks, PERCENT_TICKS } from "@/lib/chart-scale";
import {
  AXIS_TICK,
  BAR_RADIUS,
  DIM_OPACITY,
  LINE,
  SEGMENT_STROKE,
} from "@/lib/chart-theme";
import {
  formatCount,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from "@/lib/format";
import type { MonthKey } from "@/lib/reports-types";
import type { MonthRow, Series, ValueKind } from "./types";

export const DEFAULT_HEIGHT = 260;

/** Stroke would swallow segments this short (px), turning them into white lines. */
const MIN_STROKED_HEIGHT = 4;

/** Width the plot loses to the y-axis and horizontal margins. */
export function reservedWidth(y: { width: number }, marginRight: number): number {
  return y.width + marginRight;
}

/** Compact format for ticks and bar labels. */
export function formatCompact(value: number, kind: ValueKind): string {
  switch (kind) {
    case "currency":
      return formatCurrencyCompact(value);
    case "count":
      return formatCount(value);
    case "percent":
      return formatPercent(value);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** Full format for tooltips. */
export function formatFull(value: number, kind: ValueKind): string {
  switch (kind) {
    case "currency":
      return formatCurrency(value);
    case "count":
      return formatCount(value);
    case "percent":
      return formatPercent(value, 1);
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function cellValue(row: MonthRow | undefined, key: string): number | null {
  return row?.[key] ?? null;
}

export function maxOfKeys(data: readonly MonthRow[], keys: readonly string[]): number {
  let max = 0;
  for (const row of data) {
    for (const key of keys) max = Math.max(max, cellValue(row, key) ?? 0);
  }
  return max;
}

export function maxStackTotal(data: readonly MonthRow[], keys: readonly string[]): number {
  let max = 0;
  for (const row of data) {
    max = Math.max(
      max,
      keys.reduce((sum, key) => sum + (cellValue(row, key) ?? 0), 0),
    );
  }
  return max;
}

/** Key of the topmost non-zero segment of a stack (series are ordered bottom to top). */
export function topSegmentKey(row: MonthRow | undefined, series: readonly Series[]): string | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const s = series[i];
    if (s && (cellValue(row, s.key) ?? 0) > 0) return s.key;
  }
  return null;
}

const AXIS_WIDTH: Record<ValueKind, number> = { currency: 48, count: 36, percent: 42 };
const SMALL_AXIS_WIDTH: Record<ValueKind, number> = { currency: 42, count: 28, percent: 36 };

export interface YAxisOptions {
  max: number;
  valueKind: ValueKind;
  integer?: boolean;
  /** Fixed 0-100% axis for rates. */
  percentAxis?: boolean;
  small?: boolean;
}

export interface YAxisConfig {
  domain: [number, number];
  ticks: number[];
  tickFormatter: (value: number) => string;
  width: number;
  interval: 0;
  allowDataOverflow: false;
  axisLine: false;
  tickLine: false;
  tick: { fontSize: number; fill: string };
}

export function yAxisConfig({ max, valueKind, integer, percentAxis, small }: YAxisOptions): YAxisConfig {
  const ticks = percentAxis ? PERCENT_TICKS : niceTicks(max, { integer });
  const top = ticks[ticks.length - 1] ?? 1;
  // Rate axes like 0%, 2.5%, 5% need a decimal to stay distinct.
  const wholePercents = ticks.every((t) => Number.isInteger(Math.round(t * 1e6) / 1e4));
  return {
    domain: [0, top],
    ticks,
    tickFormatter: (value) =>
      valueKind === "percent" ? formatPercent(value, wholePercents ? 0 : 1) : formatCompact(value, valueKind),
    width: (small ? SMALL_AXIS_WIDTH : AXIS_WIDTH)[valueKind],
    interval: 0,
    allowDataOverflow: false,
    axisLine: false,
    tickLine: false,
    tick: small ? { ...AXIS_TICK, fontSize: 10 } : AXIS_TICK,
  };
}

export function Grid(): ReactElement {
  return <CartesianGrid vertical={false} stroke={LINE} />;
}

export function isSelected(row: { month?: unknown } | undefined, selectedMonth: MonthKey): boolean {
  return row?.month === selectedMonth;
}

/** SVG path for a rectangle whose top corners are rounded by `radius`. */
export function roundedTopPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    "Z",
  ].join(" ");
}

export interface BarShapeOptions {
  selectedMonth: MonthKey;
  /** Stacked bars: round only when this returns true for the row. Defaults to always. */
  rounded?: (row: MonthRow) => boolean;
  stroked?: boolean;
}

/**
 * Bar `shape` renderer: draws the (optionally top-rounded) bar and dims
 * months other than the selected one. Replaces the deprecated `<Cell>`, which
 * cannot carry a per-bar radius.
 */
export function barShape({ selectedMonth, rounded, stroked }: BarShapeOptions) {
  return function BarShape(props: BarShapeProps): ReactElement | null {
    const { x, y, width, height, fill, payload } = props;
    if (!(height > 0) || !(width > 0)) return null;
    const row = payload as MonthRow | undefined;
    const stroke = stroked && height >= MIN_STROKED_HEIGHT;
    const round = !rounded || !row || rounded(row);
    return (
      <path
        d={roundedTopPath(x, y, width, height, round ? BAR_RADIUS : 0)}
        fill={fill}
        fillOpacity={isSelected(row, selectedMonth) ? 1 : DIM_OPACITY}
        stroke={stroke ? SEGMENT_STROKE : "none"}
        strokeWidth={stroke ? 2 : 0}
      />
    );
  };
}
