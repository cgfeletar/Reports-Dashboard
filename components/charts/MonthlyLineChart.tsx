"use client";

/**
 * MonthlyLineChart
 * Classification: WRITE NEW (spec §6 #3, #7, #12, #13a, #18)
 */
import type { ReactElement } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DIM_OPACITY, DOT_RADIUS, LINE_STROKE_WIDTH, SEGMENT_STROKE } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthKey } from "@/lib/reports-types";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { DEFAULT_HEIGHT, Grid, isSelected, maxOfKeys, X_AXIS_PROPS, yAxisConfig } from "./shared";
import type { MonthRow, Series, ValueKind } from "./types";

export interface MonthlyLineChartProps {
  data: MonthRow[];
  series: Series[];
  selectedMonth: MonthKey;
  valueKind: ValueKind;
  height?: number;
  /** Fixed 0-100% axis for rates. */
  percentAxis?: boolean;
  integer?: boolean;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: { month?: unknown };
}

/** Exported for SmallMultiples. Selected month: larger solid dot; others: white-filled and dimmer. */
export function lineDot(color: string, selectedMonth: MonthKey) {
  return function Dot({ cx, cy, payload }: DotProps): ReactElement {
    if (typeof cx !== "number" || typeof cy !== "number") return <g />;
    return isSelected(payload, selectedMonth) ? (
      <circle cx={cx} cy={cy} r={DOT_RADIUS + 1.5} fill={color} stroke={SEGMENT_STROKE} strokeWidth={1.5} />
    ) : (
      <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={SEGMENT_STROKE} stroke={color} strokeWidth={LINE_STROKE_WIDTH} strokeOpacity={DIM_OPACITY} />
    );
  };
}

export function MonthlyLineChart({
  data,
  series,
  selectedMonth,
  valueKind,
  height = DEFAULT_HEIGHT,
  percentAxis = false,
  integer = false,
}: MonthlyLineChartProps): ReactElement {
  const reduced = useReducedMotion();
  const y = yAxisConfig({ max: maxOfKeys(data, series.map((s) => s.key)), valueKind, integer, percentAxis });

  return (
    <div>
      {series.length > 1 && <ChartLegend items={series} className="mb-3" />}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <Grid />
          <XAxis {...X_AXIS_PROPS} />
          <YAxis {...y} />
          <Tooltip
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueKind={valueKind} />}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={LINE_STROKE_WIDTH}
              connectNulls={false}
              dot={lineDot(s.color, selectedMonth)}
              activeDot={{ r: 6, fill: s.color, stroke: SEGMENT_STROKE, strokeWidth: 1.5 }}
              isAnimationActive={!reduced}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
