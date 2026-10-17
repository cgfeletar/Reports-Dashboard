"use client";

/**
 * StudioSection (spec §6 D)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { MonthlyBarChart } from "@/components/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { studioGuestsSeries } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { seriesTable } from "./section-utils";

interface StudioSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const GUESTS_SERIES = { key: "guests", name: "Guests", color: SINGLE_SERIES };

export function StudioSection({ reports, selectedMonth }: StudioSectionProps): React.JSX.Element {
  const guests = useMemo(() => studioGuestsSeries(reports), [reports]);

  return (
    <Section id="studio" title="Retreat Studio" description="Sauna, soak + steam — private, self-guided sessions.">
      <ChartGrid>
        <ChartCard
          className={fullWidthClass}
          title="Studio guests by month"
          subtitle="Busiest in winter, quieter in summer."
          caption="Number of guests who booked a studio session. Extra hours are not counted again."
          table={seriesTable(guests, [GUESTS_SERIES], "count")}
        >
          <MonthlyBarChart data={guests} series={GUESTS_SERIES} selectedMonth={selectedMonth} valueKind="count" integer showValueLabels />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
