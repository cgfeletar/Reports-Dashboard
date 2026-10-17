"use client";

/**
 * MonthlyBarChart
 * Classification: WRITE NEW (spec §6 #1, #8)
 */
import type { ReactElement } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_MAX_SIZE, LINE } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthKey } from "@/lib/reports-types";
import { barLabelContent } from "./BarLabels";
import { ChartTooltip } from "./ChartTooltip";
import { barShape, DEFAULT_HEIGHT, Grid, maxOfKeys, X_AXIS_PROPS, yAxisConfig } from "./shared";
import type { MonthRow, Series, ValueKind } from "./types";

export interface MonthlyBarChartProps {
  data: MonthRow[];
  series: Series;
  selectedMonth: MonthKey;
  valueKind: ValueKind;
  height?: number;
  showValueLabels?: boolean;
  integer?: boolean;
}

export function MonthlyBarChart({
  data,
  series,
  selectedMonth,
  valueKind,
  height = DEFAULT_HEIGHT,
  showValueLabels = false,
  integer = false,
}: MonthlyBarChartProps): ReactElement {
  const reduced = useReducedMotion();
  const y = yAxisConfig({ max: maxOfKeys(data, [series.key]), valueKind, integer });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: showValueLabels ? 18 : 8, right: 8, bottom: 0, left: 0 }}>
        <Grid />
        <XAxis {...X_AXIS_PROPS} />
        <YAxis {...y} />
        <Tooltip
          cursor={{ fill: LINE, fillOpacity: 0.5 }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueKind={valueKind} />}
        />
        <Bar
          dataKey={series.key}
          name={series.name}
          fill={series.color}
          maxBarSize={BAR_MAX_SIZE}
          isAnimationActive={!reduced}
          shape={barShape({ selectedMonth })}
        >
          {showValueLabels && (
            <LabelList
              content={barLabelContent({ data, valueKey: series.key, valueKind, selectedMonth })}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
