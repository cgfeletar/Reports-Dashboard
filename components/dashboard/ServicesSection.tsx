"use client";

/**
 * ServicesSection (spec §6 C)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { DonutChart, MonthlyLineChart, SmallMultiples, StackedBarChart } from "@/components/charts";
import type { SmallMultiplePanel } from "@/components/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { formatCount, formatCurrency, formatCurrencyCompact, formatMonthLong, formatPercent } from "@/lib/format";
import {
  addOnAttachRateSeries,
  categoryMixForMonth,
  categorySalesSeries,
  categorySeries,
  categoryUnitsPanels,
  rankCategories,
} from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { cell, findReport, GAP, seriesTable } from "./section-utils";

interface ServicesSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const ATTACH_SERIES = [{ key: "rate", name: "Add-ons per appointment", color: SINGLE_SERIES }];

export function ServicesSection({ reports, selectedMonth }: ServicesSectionProps): React.JSX.Element {
  // Ranked once across all months so each category keeps its color everywhere.
  const ranked = useMemo(() => rankCategories(reports, "Service", 6), [reports]);
  const series = useMemo(() => categorySeries(reports, "Service", ranked), [reports, ranked]);
  const sales = useMemo(() => categorySalesSeries(reports, "Service", ranked), [reports, ranked]);
  const panels = useMemo(() => categoryUnitsPanels(reports, "Service"), [reports]);
  // MonthRow's intersection type can't be satisfied by a literal; see phase1-api notes.
  const chartPanels = panels as unknown as SmallMultiplePanel[];
  const attach = useMemo(() => addOnAttachRateSeries(reports), [reports]);
  const report = findReport(reports, selectedMonth);
  const mix = useMemo(
    () => (report ? categoryMixForMonth(report, "Service", ranked) : { slices: [], total: null }),
    [report, ranked],
  );
  const monthLabel = formatMonthLong(selectedMonth);

  const mixTable = {
    caption: `Service sales by category, ${monthLabel}, before discounts`,
    columns: ["Category", "Sales", "Share"],
    rows: mix.slices.map((s) => [s.name, formatCurrency(s.value), formatPercent(s.share, 1)]),
  };

  const bookingsTable = {
    caption: "Bookings by category and month",
    columns: ["Month", ...panels.map((p) => p.title)],
    rows: reports.map((r, i) => [
      formatMonthLong(r.month),
      ...panels.map((p) => cell(p.data[i]?.value, formatCount)),
    ]),
  };

  return (
    <Section id="services" title="Services" description="What guests are booking, and how it is changing.">
      <ChartGrid>
        <ChartCard
          title="This month's service mix"
          subtitle={`${monthLabel} service sales by category, before discounts.`}
          caption="The biggest categories get their own color; smaller ones are grouped as Other."
          table={mixTable}
        >
          <DonutChart
            slices={mix.slices}
            centerValue={mix.total === null ? GAP : formatCurrencyCompact(mix.total)}
            centerLabel="service sales"
          />
        </ChartCard>
        <ChartCard
          title="Service sales by month"
          subtitle="Service sales by category, before discounts."
          caption="Colors match the service mix beside it."
          table={seriesTable(sales, series, "currency")}
        >
          <StackedBarChart data={sales} series={series} selectedMonth={selectedMonth} valueKind="currency" />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Bookings by category"
          subtitle="Number of services booked each month. Each panel has its own scale — compare shape over time, not height across panels."
          caption="Each panel has its own scale — compare shape over time, not height across panels."
          table={bookingsTable}
        >
          <SmallMultiples
            panels={chartPanels}
            kind="bar"
            valueKind="count"
            selectedMonth={selectedMonth}
            sharedScale={false}
            integer
            columns="sm2-lg3"
          />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Add-on attach rate"
          subtitle="Add-on services per appointment — your upsell metric"
          caption="1.0 would mean one add-on for every appointment."
          table={seriesTable(attach, ATTACH_SERIES, "percent")}
        >
          <MonthlyLineChart data={attach} series={ATTACH_SERIES} selectedMonth={selectedMonth} valueKind="percent" />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
