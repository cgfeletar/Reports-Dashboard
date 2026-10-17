"use client";

/**
 * TeamSection (spec §6 G)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { SmallMultiples } from "@/components/charts";
import { BarList } from "@/components/ui/BarList";
import type { BarListItem } from "@/components/ui/BarList";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { formatCurrency, formatCurrencyWhole, formatMonthLong, formatPercent } from "@/lib/format";
import { teamPerformance, utilizationPanels } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { cell, findReport, toPanels } from "./section-utils";

interface TeamSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const pct = (v: number): string => formatPercent(v);

export function TeamSection({ reports, selectedMonth }: TeamSectionProps): React.JSX.Element {
  const report = findReport(reports, selectedMonth);
  const team = useMemo(() => (report ? teamPerformance(report) : []), [report]);
  const panels = useMemo(() => utilizationPanels(reports), [reports]);
  const monthLabel = formatMonthLong(selectedMonth);

  const items: BarListItem[] = team.map((m) => ({
    id: m.name,
    name: m.name,
    meta: m.role,
    value: m.serviceSales,
    valueLabel: formatCurrencyWhole(m.serviceSales),
    detail: `utilization ${cell(m.utilization, pct)} · rebook ${cell(m.rebookRate, pct)} · retail ${formatCurrencyWhole(m.retailSales)}`,
  }));

  const teamTable = {
    caption: `Team performance, ${monthLabel}`,
    columns: ["Provider", "Role", "Service sales", "Utilization", "Rebook rate", "Retail sales"],
    rows: team.map((m) => [
      m.name,
      m.role,
      formatCurrency(m.serviceSales),
      cell(m.utilization, pct),
      cell(m.rebookRate, pct),
      formatCurrency(m.retailSales),
    ]),
  };

  const utilTable = {
    caption: "Utilization by provider and month",
    columns: ["Month", ...panels.map((p) => p.title)],
    rows: reports.map((r, i) => [
      formatMonthLong(r.month),
      ...panels.map((p) => cell(p.data[i]?.value, pct)),
    ]),
  };

  return (
    <Section id="team" title="Team" description="How each provider is doing, and how full their schedules are.">
      <ChartGrid>
        <ChartCard
          className={fullWidthClass}
          title={`Team performance, ${monthLabel}`}
          subtitle="Service sales per provider, with schedule fill and rebooking underneath"
          caption="Utilization is booked hours out of available hours. Front desk and self-guided studio are not included."
          table={teamTable}
        >
          {items.length > 0 ? (
            <BarList items={items} label={`Service sales by provider, ${monthLabel}`} columns={2} />
          ) : (
            <p className="text-sm font-light text-ink-soft">No team data for {monthLabel}.</p>
          )}
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Utilization by month"
          subtitle="How much of each provider's available time was booked"
          caption="Every panel runs from 0% to 100%, so you can compare providers at a glance."
          table={utilTable}
        >
          <SmallMultiples
            panels={toPanels(panels)}
            kind="line"
            valueKind="percent"
            selectedMonth={selectedMonth}
            sharedScale
            percentAxis
          />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
