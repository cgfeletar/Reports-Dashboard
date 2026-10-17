"use client";

/**
 * RetailSection (spec §6 E)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { DonutChart, MonthlyLineChart, SmallMultiples } from "@/components/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { formatCount, formatCurrency, formatCurrencyWhole, formatMonthLong, formatPercent } from "@/lib/format";
import { categoryMixForMonth, categoryUnitsPanels, rankCategories, retailPerClientSeries } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { cell, findReport, GAP, seriesTable, toPanels } from "./section-utils";

interface RetailSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const PER_CLIENT_SERIES = [{ key: "value", name: "Retail per client", color: SINGLE_SERIES }];

export function RetailSection({ reports, selectedMonth }: RetailSectionProps): React.JSX.Element {
  const ranked = useMemo(() => rankCategories(reports, "Retail", 6), [reports]);
  const panels = useMemo(() => categoryUnitsPanels(reports, "Retail"), [reports]);
  const perClient = useMemo(() => retailPerClientSeries(reports), [reports]);
  const report = findReport(reports, selectedMonth);
  const mix = useMemo(
    () => (report ? categoryMixForMonth(report, "Retail", ranked) : { slices: [], total: null }),
    [report, ranked],
  );
  const monthLabel = formatMonthLong(selectedMonth);

  const mixTable = {
    caption: `Retail sales by category, ${monthLabel}`,
    columns: ["Category", "Sales before discounts", "Share"],
    rows: mix.slices.map((s) => [s.name, formatCurrency(s.value), formatPercent(s.share, 1)]),
  };

  const overTimeTable = {
    caption: "Retail sales and items sold by category and month",
    columns: ["Month", "Category", "Sales before discounts", "Items sold"],
    rows: panels.flatMap((p) =>
      p.data.map((d) => [formatMonthLong(d.month), p.title, cell(d.value, formatCurrency), cell(d.units, formatCount)]),
    ),
  };

  return (
    <Section id="retail" title="Retail" description="The products your clients take home, and which ones they love.">
      <ChartGrid>
        <ChartCard
          title="This month's retail mix"
          subtitle={`Retail sales before discounts, ${monthLabel}`}
          caption="Each slice is one product category's share of this month's retail sales."
          table={mixTable}
        >
          {mix.slices.length > 0 ? (
            <DonutChart
              slices={mix.slices}
              centerLabel="Retail"
              centerValue={mix.total === null ? GAP : formatCurrencyWhole(mix.total)}
            />
          ) : (
            <p className="text-sm font-light text-ink-soft">No retail sales were recorded for {monthLabel}.</p>
          )}
        </ChartCard>
        <ChartCard
          title="Retail per client"
          subtitle="Retail sales divided by clients served"
          caption="Shows how much retail the average client takes home each month."
          table={seriesTable(perClient, PER_CLIENT_SERIES, "currency")}
        >
          <MonthlyLineChart data={perClient} series={PER_CLIENT_SERIES} selectedMonth={selectedMonth} valueKind="currency" />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Retail by category over time"
          subtitle="Sales before discounts, with the number of items sold in brackets"
          caption="Every panel uses the same scale, so taller bars really are bigger sellers."
          table={overTimeTable}
        >
          <SmallMultiples
            panels={toPanels(panels)}
            kind="bar"
            valueKind="currency"
            selectedMonth={selectedMonth}
            sharedScale
            labelUnitsKey="units"
            columns="lg2"
          />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
