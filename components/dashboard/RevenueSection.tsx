"use client";

/**
 * RevenueSection (spec §6 B)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { MonthlyBarChart, MonthlyLineChart, StackedBarChart } from "@/components/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { discountRateSeries, netSalesSeries, REVENUE_MIX_SERIES, revenueMixSeries } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { seriesTable } from "./section-utils";

interface RevenueSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const NET_SERIES = { key: "net", name: "Net sales", color: SINGLE_SERIES };
const DISCOUNT_SERIES = [{ key: "rate", name: "Discount rate", color: SINGLE_SERIES }];

export function RevenueSection({ reports, selectedMonth }: RevenueSectionProps): React.JSX.Element {
  const net = useMemo(() => netSalesSeries(reports), [reports]);
  const mix = useMemo(() => revenueMixSeries(reports), [reports]);
  const discounts = useMemo(() => discountRateSeries(reports), [reports]);

  return (
    <Section id="revenue" title="Revenue" description="What came in, and where it came from.">
      <ChartGrid>
        <ChartCard
          title="Net sales by month"
          subtitle="Total sales after discounts, refunds and card fees."
          caption="Net sales for each month. The month you picked is highlighted."
          table={seriesTable(net, [NET_SERIES], "currency")}
        >
          <MonthlyBarChart data={net} series={NET_SERIES} selectedMonth={selectedMonth} valueKind="currency" showValueLabels />
        </ChartCard>
        <ChartCard
          title="Where the money came from"
          subtitle="Services, retail, memberships and gift card sales, before discounts and fees."
          caption="Each bar adds up the four sources of income for that month."
          table={seriesTable(mix, REVENUE_MIX_SERIES, "currency")}
        >
          <StackedBarChart data={mix} series={REVENUE_MIX_SERIES} selectedMonth={selectedMonth} valueKind="currency" />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Discount rate"
          subtitle="Share of service and retail sales given away as discounts."
          caption="A rising line means more of your sales are being discounted."
          table={seriesTable(discounts, DISCOUNT_SERIES, "percent")}
        >
          <MonthlyLineChart data={discounts} series={DISCOUNT_SERIES} selectedMonth={selectedMonth} valueKind="percent" />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
