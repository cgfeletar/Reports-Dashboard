"use client";

/**
 * GroupedBarChart
 * Classification: WRITE NEW (spec §6 #13b, #14)
 */
import type { ReactElement } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_MAX_SIZE, LINE } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthKey } from "@/lib/reports-types";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { barShape, DEFAULT_HEIGHT, Grid, maxOfKeys, reservedWidth, yAxisConfig } from "./shared";
import { useChartSlot, xAxisProps } from "./ticks";
import type { MonthRow, Series, ValueKind } from "./types";

export interface GroupedBarChartProps {
  data: MonthRow[];
  series: Series[];
  selectedMonth: MonthKey;
  valueKind: ValueKind;
  height?: number;
}

export function GroupedBarChart({
  data,
  series,
  selectedMonth,
  valueKind,
  height = DEFAULT_HEIGHT,
}: GroupedBarChartProps): ReactElement {
  const reduced = useReducedMotion();
  const y = yAxisConfig({ max: maxOfKeys(data, series.map((s) => s.key)), valueKind, integer: valueKind === "count" });

  const { slotPx, onResize } = useChartSlot(data.length, reservedWidth(y, 8));

  return (
    <div>
      <ChartLegend items={series} className="mb-3" />
      <ResponsiveContainer width="100%" height={height} onResize={onResize}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <Grid />
          <XAxis {...xAxisProps({ slotPx })} />
          <YAxis {...y} />
          <Tooltip
            cursor={{ fill: LINE, fillOpacity: 0.5 }}
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueKind={valueKind} />}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={!reduced}
              shape={barShape({ selectedMonth })}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
