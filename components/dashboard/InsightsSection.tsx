"use client";

/**
 * InsightsSection (spec §6 H)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { MonthlyLineChart } from "@/components/charts";
import type { Series } from "@/components/charts";
import { BarList } from "@/components/ui/BarList";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { formatCount, formatCurrency, formatCurrencyWhole, formatMonthLong } from "@/lib/format";
import { avgSpendSeries, topServices } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { findReport, seriesTable } from "./section-utils";

interface InsightsSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const AVG_SPEND: Series[] = [{ key: "value", name: "Average spend per client", color: SINGLE_SERIES }];

export function InsightsSection({ reports, selectedMonth }: InsightsSectionProps): React.JSX.Element {
  const report = findReport(reports, selectedMonth);
  const top = useMemo(() => (report ? topServices(report, 10) : []), [report]);
  const spend = useMemo(() => avgSpendSeries(reports), [reports]);
  const monthLabel = formatMonthLong(selectedMonth);

  // valueLabel carries the dollars; detail only adds bookings so the amount isn't shown twice.
  const items = top.map((s, i) => ({
    id: `${i}-${s.name}`,
    name: s.name,
    meta: s.category,
    value: s.net,
    valueLabel: formatCurrencyWhole(s.net),
    detail: `${formatCount(s.units)} booked`,
  }));

  const topTable = {
    caption: `Top services, ${monthLabel}`,
    columns: ["Service", "Category", "Net sales", "Booked"],
    rows: top.map((s) => [s.name, s.category, formatCurrency(s.net), formatCount(s.units)]),
  };

  return (
    <Section id="insights" title="Insights" description="Your best sellers and what the average client spends.">
      <ChartGrid>
        <ChartCard
          className={fullWidthClass}
          title="Average spend per client"
          subtitle="Net sales divided by clients served"
          caption="Rising spend means each visit is worth more, even if client numbers stay the same."
          table={seriesTable(spend, AVG_SPEND, "currency")}
        >
          <MonthlyLineChart data={spend} series={AVG_SPEND} selectedMonth={selectedMonth} valueKind="currency" />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title={`Top 10 services, ${monthLabel}`}
          subtitle="Ranked by sales after discounts"
          caption="Your ten best-selling services this month, with how many were booked."
          table={topTable}
        >
          {items.length > 0 ? (
            <BarList items={items} label={`Top services by sales, ${monthLabel}`} columns={2} />
          ) : (
            <p className="text-sm font-light text-ink-soft">No service sales were recorded for {monthLabel}.</p>
          )}
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
