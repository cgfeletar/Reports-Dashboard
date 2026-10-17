"use client";

/**
 * StackedBarChart
 * Classification: WRITE NEW (spec §6 #2, #5, #11)
 */
import type { ReactElement } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_MAX_SIZE, LINE } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthKey } from "@/lib/reports-types";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { barShape, DEFAULT_HEIGHT, Grid, maxStackTotal, reservedWidth, topSegmentKey, yAxisConfig } from "./shared";
import { useChartSlot, xAxisProps } from "./ticks";
import type { MonthRow, Series, ValueKind } from "./types";

export interface StackedBarChartProps {
  /** Bottom to top. */
  series: Series[];
  data: MonthRow[];
  selectedMonth: MonthKey;
  valueKind: ValueKind;
  height?: number;
  tooltipFooter?: (row: MonthRow) => string | null;
}

export function StackedBarChart({
  data,
  series,
  selectedMonth,
  valueKind,
  height = DEFAULT_HEIGHT,
  tooltipFooter,
}: StackedBarChartProps): ReactElement {
  const reduced = useReducedMotion();
  const y = yAxisConfig({ max: maxStackTotal(data, series.map((s) => s.key)), valueKind });

  const { slotPx, onResize } = useChartSlot(data.length, reservedWidth(y, 8));

  return (
    <div>
      {/* Top segment first, matching the tooltip order. */}
      <ChartLegend items={[...series].reverse()} className="mb-3" />
      <ResponsiveContainer width="100%" height={height} onResize={onResize}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <Grid />
          <XAxis {...xAxisProps({ slotPx })} />
          <YAxis {...y} />
          <Tooltip
            cursor={{ fill: LINE, fillOpacity: 0.5 }}
            content={(p) => (
              <ChartTooltip
                active={p.active}
                payload={p.payload}
                label={p.label}
                valueKind={valueKind}
                reverse
                total
                footer={tooltipFooter}
              />
            )}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="stack"
              fill={s.color}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={!reduced}
              shape={barShape({
                selectedMonth,
                stroked: true,
                rounded: (row) => topSegmentKey(row, series) === s.key,
              })}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
