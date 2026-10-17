import { SampleDataPill } from "./SampleDataPill";

interface DashboardHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  isDemo: boolean;
}

/** DashboardHeader — Classification: WRITE NEW. */
export function DashboardHeader({ eyebrow, title, subtitle, isDemo }: DashboardHeaderProps): React.JSX.Element {
  return (
    <header className="border-b border-line pb-8 pt-10 max-xs:pt-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">{eyebrow}</p>
        {isDemo ? <SampleDataPill /> : null}
      </div>
      <h1 className="mt-3 font-display text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.1] text-ink">{title}</h1>
      <p className="mt-3 max-w-2xl text-[15px] font-light text-ink-soft">{subtitle}</p>
    </header>
  );
}
