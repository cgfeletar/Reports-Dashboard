"use client";

/**
 * ClientsSection (spec §6 F)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { GroupedBarChart, MonthlyLineChart, StackedBarChart } from "@/components/charts";
import type { Series } from "@/components/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartGrid, fullWidthClass } from "@/components/ui/ChartGrid";
import { Section } from "@/components/ui/Section";
import { SINGLE_SERIES } from "@/lib/chart-theme";
import { formatPercent } from "@/lib/format";
import {
  CLIENT_SERIES,
  clientsSeries,
  GIFT_CARD_SERIES,
  giftCardSeries,
  MEMBERSHIP_SERIES,
  membershipSeries,
  rebookingRateSeries,
} from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { seriesTable } from "./section-utils";

interface ClientsSectionProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

const REBOOKING: Series[] = [{ key: "rate", name: "Rebooking rate", color: SINGLE_SERIES }];
const ACTIVE_MEMBERS: Series[] = [{ key: "active", name: "Active members", color: SINGLE_SERIES }];

export function ClientsSection({ reports, selectedMonth }: ClientsSectionProps): React.JSX.Element {
  const clients = useMemo(() => clientsSeries(reports), [reports]);
  const rebooking = useMemo(() => rebookingRateSeries(reports), [reports]);
  const members = useMemo(() => membershipSeries(reports), [reports]);
  const giftCards = useMemo(() => giftCardSeries(reports), [reports]);

  return (
    <Section id="clients" title="Clients & loyalty" description="Who is coming in, who is coming back, and who has joined your circle.">
      <ChartGrid>
        <ChartCard
          title="New vs. returning clients"
          subtitle="How many clients you served each month"
          caption="Returning clients are on the bottom, new clients on top. Hover a bar to see the share of new clients."
          table={seriesTable(clients, CLIENT_SERIES, "count")}
        >
          <StackedBarChart
            data={clients}
            series={CLIENT_SERIES}
            selectedMonth={selectedMonth}
            valueKind="count"
            tooltipFooter={(row) => {
              const fresh = row["new"];
              const back = row["returning"];
              if (fresh === null || fresh === undefined || back === null || back === undefined) return null;
              const total = fresh + back;
              return total === 0 ? null : `New: ${formatPercent(fresh / total)} of clients`;
            }}
          />
        </ChartCard>
        <ChartCard
          title="Rebooking rate"
          subtitle="Share of visits where the client booked their next one"
          caption="A higher line means more clients are committing to a return visit."
          table={seriesTable(rebooking, REBOOKING, "percent")}
        >
          <MonthlyLineChart data={rebooking} series={REBOOKING} selectedMonth={selectedMonth} valueKind="percent" percentAxis />
        </ChartCard>
        <ChartCard
          title="Active members"
          subtitle="Members on the books at the end of each month"
          caption="Membership count at month end."
          table={seriesTable(members, ACTIVE_MEMBERS, "count")}
        >
          <MonthlyLineChart data={members} series={ACTIVE_MEMBERS} selectedMonth={selectedMonth} valueKind="count" integer />
        </ChartCard>
        <ChartCard
          title="New vs. cancelled members"
          subtitle="Who joined and who left each month"
          caption="Growth happens when the first bar is taller than the second."
          table={seriesTable(members, MEMBERSHIP_SERIES, "count")}
        >
          <GroupedBarChart data={members} series={MEMBERSHIP_SERIES} selectedMonth={selectedMonth} valueKind="count" />
        </ChartCard>
        <ChartCard
          className={fullWidthClass}
          title="Gift cards, sold vs. redeemed"
          subtitle="Dollars sold and dollars used each month; expect spikes in December (holidays) and May (Mother's Day)"
          caption="Cards sold are future visits; cards redeemed are those visits happening."
          table={seriesTable(giftCards, GIFT_CARD_SERIES, "currency")}
        >
          <GroupedBarChart data={giftCards} series={GIFT_CARD_SERIES} selectedMonth={selectedMonth} valueKind="currency" />
        </ChartCard>
      </ChartGrid>
    </Section>
  );
}
