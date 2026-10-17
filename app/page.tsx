import { Dashboard } from "@/components/dashboard/Dashboard";
import { business } from "@/lib/business";
import { loadReports } from "@/lib/reports-source";

export default function Page(): React.JSX.Element {
  const reports = loadReports();

  if (reports.length === 0) {
    return (
      <main className="mx-auto max-w-[var(--maxw-shell)] px-7 pb-24 max-xs:px-[18px]">
        <header className="border-b border-line pb-8 pt-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">{business.name}</p>
          <h1 className="mt-3 font-display text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.1] text-ink">
            Monthly Reports
          </h1>
        </header>
        <p className="mt-10 text-[15px] font-light text-ink-soft">
          No reports yet — add a folder under reports/ and rebuild.
        </p>
      </main>
    );
  }

  return <Dashboard reports={reports} business={{ name: business.name, isDemo: business.isDemo }} />;
}
