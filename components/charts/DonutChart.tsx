"use client";

/**
 * DonutChart
 * Classification: WRITE NEW (spec §6 #4, #9)
 */
import type { ReactElement } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SEGMENT_STROKE } from "@/lib/chart-theme";
import { formatCurrency, formatCurrencyWhole, formatPercent } from "@/lib/format";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutSlice {
  key: string;
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  valueKind?: "currency";
  height?: number;
}

export function DonutChart({ slices, centerLabel, centerValue, height = 240 }: DonutChartProps): ReactElement {
  const reduced = useReducedMotion();
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const share = (value: number): number => (total > 0 ? value / total : 0);

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
      <div className="relative w-full max-w-[280px] shrink-0 md:w-[240px]" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip
              content={(p) => {
                const entry = p.payload?.[0];
                const slice = entry?.payload as DonutSlice | undefined;
                if (!entry || !slice) return null;
                return (
                  <ChartTooltip
                    active={p.active}
                    title={slice.name}
                    valueKind="currency"
                    payload={[
                      { name: `${formatPercent(share(slice.value), 1)} of total`, value: slice.value, color: slice.color },
                    ]}
                  />
                );
              }}
            />
            <Pie
              data={slices.map((s) => ({ ...s, fill: s.color }))}
              dataKey="value"
              nameKey="name"
              name={centerLabel}
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={0}
              startAngle={90}
              endAngle={-270}
              stroke={SEGMENT_STROKE}
              strokeWidth={2}
              isAnimationActive={!reduced}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="font-display text-[22px] font-medium leading-tight text-ink">{centerValue}</span>
          <span className="mt-0.5 text-[11px] leading-tight text-ink-soft">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-[13px]">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 text-ink">{slice.name}</span>
            <span className="tabular-nums text-ink" title={formatCurrency(slice.value)}>
              {formatCurrencyWhole(slice.value)}
            </span>
            <span className="w-11 text-right tabular-nums text-ink-soft">{formatPercent(share(slice.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
