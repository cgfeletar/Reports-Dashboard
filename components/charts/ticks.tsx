"use client";

import { useCallback, useState, type ReactElement } from "react";
import { INK_SOFT } from "@/lib/chart-theme";
import { formatMonthTick } from "@/lib/format";
import type { MonthKey } from "@/lib/reports-types";

/** Below this per-month slot width (px) tick labels are angled so they cannot collide. */
const ANGLE_BELOW = 24;
const ANGLE_BELOW_SMALL = 20;
/** Below this slot width even -45° neighbours touch, so tilt further. */
const STEEP_BELOW = 18;
const HEIGHT_FLAT = 34;
const HEIGHT_ANGLED = 44;
const HEIGHT_STEEP = 48;

export interface TickLayout {
  angled: boolean;
  /** Rotation in degrees (0 when flat). */
  angle: number;
  height: number;
}

/** `slotPx` is the width of one month's slot; null until measured (assume wide). */
export function tickLayout(slotPx: number | null, small = false): TickLayout {
  const angled = slotPx !== null && slotPx < (small ? ANGLE_BELOW_SMALL : ANGLE_BELOW);
  if (!angled) return { angled, angle: 0, height: HEIGHT_FLAT };
  const steep = slotPx < STEEP_BELOW;
  return { angled, angle: steep ? -60 : -45, height: steep ? HEIGHT_STEEP : HEIGHT_ANGLED };
}

/** Value labels (and their units line) need more room than a tick; narrower slots drop secondary labels. */
export function labelsFit(slotPx: number | null, hasUnits: boolean): boolean {
  return slotPx === null || slotPx >= (hasUnits ? 30 : 26);
}

export interface TickParts {
  month: string;
  /** `'25`, only on the first tick and on January. */
  year: string | null;
}

export function monthTickParts(month: MonthKey, index: number): TickParts {
  const [name = month, year] = formatMonthTick(month, index).split(" ");
  return { month: name, year: year ?? null };
}

interface TickRendererProps {
  x?: number | string;
  y?: number | string;
  index?: number;
  payload?: { value?: unknown };
}

const FONT_SIZE = 11;

/** XAxis `tick` renderer: month on line 1, year on line 2 (or inline when angled). */
export function monthTick(layout: TickLayout) {
  return function MonthTick({ x, y, index, payload }: TickRendererProps): ReactElement {
    const month = typeof payload?.value === "string" ? payload.value : "";
    const cx = Number(x);
    const cy = Number(y);
    const { month: name, year } = monthTickParts(month, index ?? 1);
    if (layout.angled) {
      return (
        <text
          className="chart-x-tick"
          x={cx}
          y={cy}
          dy="0.5em"
          fontSize={FONT_SIZE}
          fill={INK_SOFT}
          textAnchor="end"
          transform={`rotate(${layout.angle} ${cx} ${cy})`}
        >
          {year ? `${name} ${year}` : name}
        </text>
      );
    }
    return (
      <text className="chart-x-tick" x={cx} y={cy} fontSize={FONT_SIZE} fill={INK_SOFT} textAnchor="middle">
        <tspan x={cx} dy="0.71em">
          {name}
        </tspan>
        {year && (
          <tspan x={cx} dy="1.2em">
            {year}
          </tspan>
        )}
      </text>
    );
  };
}

export interface XAxisOptions {
  slotPx: number | null;
  small?: boolean;
}

/** Spread onto `<XAxis>`. */
export function xAxisProps({ slotPx, small = false }: XAxisOptions) {
  const layout = tickLayout(slotPx, small);
  return {
    dataKey: "month",
    interval: 0,
    axisLine: false,
    tickLine: false,
    tick: monthTick(layout),
    tickMargin: small ? 4 : 6,
    height: layout.height,
  } as const;
}

export interface ChartSlot {
  slotPx: number | null;
  onResize: (width: number) => void;
}

/**
 * Per-month slot width from ResponsiveContainer's `onResize`. `reserved` is the
 * non-plot width (y-axis + horizontal margins). Null until measured, so SSR and
 * jsdom render the wide layout.
 */
export function useChartSlot(count: number, reserved: number): ChartSlot {
  const [width, setWidth] = useState<number | null>(null);
  const onResize = useCallback((w: number): void => setWidth((prev) => (prev === w ? prev : w)), []);
  const slotPx = width === null || count === 0 ? null : Math.max(0, (width - reserved) / count);
  return { slotPx, onResize };
}
