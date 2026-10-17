"use client";

/**
 * SmallMultiples
 * Classification: WRITE NEW (spec §6 #6, #10, #16)
 */
import type { ReactElement } from "react";
import { Bar, BarChart, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAR_MAX_SIZE, LINE, LINE_STROKE_WIDTH, SEGMENT_STROKE, SINGLE_SERIES } from "@/lib/chart-theme";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthKey } from "@/lib/reports-types";
import { barLabelContent } from "./BarLabels";
import { ChartTooltip } from "./ChartTooltip";
import { lineDot } from "./MonthlyLineChart";
import { barShape, Grid, maxOfKeys, reservedWidth, yAxisConfig } from "./shared";
import { labelsFit, useChartSlot, xAxisProps } from "./ticks";
import type { MonthRow, ValueKind } from "./types";

export interface SmallMultiplePanel {
  id: string;
  title: string;
  data: MonthRow[];
}

export interface SmallMultiplesProps {
  panels: SmallMultiplePanel[];
  valueKey?: string;
  kind: "bar" | "line";
  valueKind: ValueKind;
  selectedMonth: MonthKey;
  /** One y-scale for every panel (from the global max) instead of one per panel. */
  sharedScale: boolean;
  integer?: boolean;
  percentAxis?: boolean;
  /** Bars only: row key with unit counts, shown as `(14)` under the value label. */
  labelUnitsKey?: string;
  /** `lg2`: one column until lg, then two. */
  columns?: "sm2-lg3" | "sm2" | "lg2";
  panelHeight?: number;
}

const GRID_CLASS: Record<NonNullable<SmallMultiplesProps["columns"]>, string> = {
  "sm2-lg3": "grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3",
  sm2: "grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2",
  lg2: "grid grid-cols-1 gap-x-6 gap-y-7 lg:grid-cols-2",
};

const MARGIN_RIGHT = 14;

export function SmallMultiples({
  panels,
  valueKey = "value",
  kind,
  valueKind,
  selectedMonth,
  sharedScale,
  integer = false,
  percentAxis = false,
  labelUnitsKey,
  columns = "sm2-lg3",
  panelHeight = 160,
}: SmallMultiplesProps): ReactElement {
  const reduced = useReducedMotion();
  const globalMax = Math.max(0, ...panels.map((p) => maxOfKeys(p.data, [valueKey])));
  const labelled = kind === "bar" && labelUnitsKey !== undefined;
  const topMargin = labelled ? 34 : 10;
  const firstData = panels[0]?.data ?? [];
  const yReference = yAxisConfig({ max: 0, valueKind, integer, percentAxis, small: true });
  // Panels share one width, so any panel's resize event measures them all.
  const { slotPx, onResize } = useChartSlot(firstData.length, reservedWidth(yReference, MARGIN_RIGHT));
  const xAxis = xAxisProps({ slotPx, small: true });

  return (
    <div className={GRID_CLASS[columns]}>
      {panels.map((panel) => {
        const y = yAxisConfig({
          max: sharedScale ? globalMax : maxOfKeys(panel.data, [valueKey]),
          valueKind,
          integer,
          percentAxis,
          small: true,
        });
        const tooltip = (
          <Tooltip
            cursor={kind === "bar" ? { fill: LINE, fillOpacity: 0.5 } : undefined}
            content={(p) => (
              <ChartTooltip active={p.active} payload={p.payload} label={p.label} valueKind={valueKind} />
            )}
          />
        );
        const margin = { top: topMargin, right: MARGIN_RIGHT, bottom: 0, left: 0 };
        return (
          <div key={panel.id} className="min-w-0">
            <h4 className="mb-1 text-[13px] font-medium text-ink">{panel.title}</h4>
            <ResponsiveContainer width="100%" height={panelHeight + (labelled ? 24 : 0)} onResize={onResize}>
              {kind === "bar" ? (
                <BarChart data={panel.data} margin={margin}>
                  <Grid />
                  <XAxis {...xAxis} />
                  <YAxis {...y} />
                  {tooltip}
                  <Bar
                    dataKey={valueKey}
                    name={panel.title}
                    fill={SINGLE_SERIES}
                    maxBarSize={BAR_MAX_SIZE}
                    isAnimationActive={!reduced}
                    shape={barShape({ selectedMonth })}
                  >
                    {labelled && (
                      <LabelList
                        content={barLabelContent({
                          data: panel.data,
                          valueKey,
                          valueKind,
                          selectedMonth,
                          unitsKey: labelUnitsKey,
                          fontSize: 9,
                          hideSecondary: !labelsFit(slotPx, true),
                        })}
                      />
                    )}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={panel.data} margin={margin}>
                  <Grid />
                  <XAxis {...xAxis} />
                  <YAxis {...y} />
                  {tooltip}
                  <Line
                    type="linear"
                    dataKey={valueKey}
                    name={panel.title}
                    stroke={SINGLE_SERIES}
                    strokeWidth={LINE_STROKE_WIDTH}
                    connectNulls={false}
                    dot={lineDot(SINGLE_SERIES, selectedMonth)}
                    activeDot={{ r: 6, fill: SINGLE_SERIES, stroke: SEGMENT_STROKE, strokeWidth: 1.5 }}
                    isAnimationActive={!reduced}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
