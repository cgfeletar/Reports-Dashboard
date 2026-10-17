"use client";

/**
 * AtAGlance (spec §6 A)
 * Classification: WRITE NEW
 */
import { useMemo } from "react";
import { Section } from "@/components/ui/Section";
import { TileGrid } from "@/components/ui/ChartGrid";
import { StatTile } from "@/components/ui/StatTile";
import { formatChange, formatCount, formatCurrencyWhole, formatMonthLong, formatPercent } from "@/lib/format";
import { buildKpis, type Kpi } from "@/lib/reports-transform";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { cell } from "./section-utils";

interface AtAGlanceProps {
  reports: MonthReport[];
  selectedMonth: MonthKey;
}

export function AtAGlance({ reports, selectedMonth }: AtAGlanceProps): React.JSX.Element {
  const kpis = useMemo(() => buildKpis(reports, selectedMonth), [reports, selectedMonth]);
  const { hints } = kpis;
  const change = (k: Kpi) => formatChange(k.value, k.previous, k.changeKind);
  const money = (v: number | null) => cell(v, formatCurrencyWhole);
  const pct = (v: number | null) => cell(v, (n) => formatPercent(n, 0));

  const hint = (v: number | null, text: (n: number) => string): string | undefined =>
    v === null ? undefined : text(v);
  const members =
    hints.newMembers === null || hints.cancelled === null
      ? undefined
      : `+${formatCount(hints.newMembers)} new / −${formatCount(hints.cancelled)} cancelled`;

  return (
    <Section id="glance" title="At a glance" description={`${formatMonthLong(selectedMonth)} compared with the month before.`}>
      <TileGrid>
        <StatTile label="Net sales" value={money(kpis.netSales.value)} change={change(kpis.netSales)} />
        <StatTile label="Service sales" value={money(kpis.serviceSales.value)} change={change(kpis.serviceSales)} />
        <StatTile
          label="Retail sales"
          value={money(kpis.retailSales.value)}
          change={change(kpis.retailSales)}
          hint={hint(hints.retailPerClient, (n) => `${formatCurrencyWhole(n)} retail per client`)}
        />
        <StatTile
          label="Clients served"
          value={cell(kpis.clients.value, formatCount)}
          change={change(kpis.clients)}
          hint={hint(hints.newClients, (n) => `${formatCount(n)} new clients`)}
        />
        <StatTile label="Rebooking rate" value={pct(kpis.rebookingRate.value)} change={change(kpis.rebookingRate)} />
        <StatTile
          label="Active members"
          value={cell(kpis.activeMembers.value, formatCount)}
          change={change(kpis.activeMembers)}
          hint={members}
        />
        <StatTile label="Average spend per client" value={money(kpis.avgSpend.value)} change={change(kpis.avgSpend)} />
        <StatTile label="Team utilization" value={pct(kpis.utilization.value)} change={change(kpis.utilization)} />
      </TileGrid>
    </Section>
  );
}
