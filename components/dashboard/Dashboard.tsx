"use client";

/**
 * Dashboard
 * Classification: WRITE NEW (spec §6)
 */
import { useMemo, useState } from "react";
import { DashboardHeader } from "@/components/ui/DashboardHeader";
import { MonthSelect } from "@/components/ui/MonthSelect";
import { formatMonthLong } from "@/lib/format";
import type { MonthKey, MonthReport } from "@/lib/reports-types";
import { AtAGlance } from "./AtAGlance";
import { ClientsSection } from "./ClientsSection";
import { InsightsSection } from "./InsightsSection";
import { RetailSection } from "./RetailSection";
import { RevenueSection } from "./RevenueSection";
import { ServicesSection } from "./ServicesSection";
import { StudioSection } from "./StudioSection";
import { TeamSection } from "./TeamSection";

interface DashboardProps {
  reports: MonthReport[];
  business: { name: string; isDemo: boolean };
}

export function Dashboard({
  reports,
  business,
}: DashboardProps): React.JSX.Element {
  const latest = reports[reports.length - 1]?.month ?? "";
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(latest);

  const months = useMemo(
    () =>
      [...reports]
        .reverse()
        .map((r) => ({ value: r.month, label: formatMonthLong(r.month) })),
    [reports],
  );

  return (
    <main className="mx-auto max-w-[var(--maxw-shell)] px-7 pb-24 max-xs:px-[18px]">
      <DashboardHeader
        eyebrow={"Wellness Spa"}
        title="Monthly Reports"
        subtitle={`How ${formatMonthLong(selectedMonth)} went — sales, services, clients and team at a glance.`}
        isDemo={business.isDemo}
      />
      <div className="mt-8">
        <MonthSelect
          months={months}
          value={selectedMonth}
          onValueChange={setSelectedMonth}
        />
      </div>

      <AtAGlance reports={reports} selectedMonth={selectedMonth} />
      <RevenueSection reports={reports} selectedMonth={selectedMonth} />
      <ServicesSection reports={reports} selectedMonth={selectedMonth} />
      <StudioSection reports={reports} selectedMonth={selectedMonth} />
      <RetailSection reports={reports} selectedMonth={selectedMonth} />
      <ClientsSection reports={reports} selectedMonth={selectedMonth} />
      <TeamSection reports={reports} selectedMonth={selectedMonth} />
      <InsightsSection reports={reports} selectedMonth={selectedMonth} />

      <footer className="mt-16 border-t border-line pt-6 text-xs font-light leading-relaxed text-ink-soft">
        {business.isDemo ? <p>All figures are fictional sample data.</p> : null}
        <p>
          Category sales are shown before discounts. Net sales are after
          discounts, refunds and fees.
        </p>
      </footer>
    </main>
  );
}
