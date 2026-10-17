import type { Change } from "@/lib/format";

interface StatTileProps {
  label: string;
  value: string;
  change: Change | null;
  changeSuffix?: string;
  hint?: string;
}

/** StatTile — Classification: WRITE NEW. Change text stays ink-colored; the arrow carries direction. */
export function StatTile({ label, value, change, changeSuffix = "vs. last month", hint }: StatTileProps): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--card-shadow)] max-xs:p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-[30px] font-medium leading-tight tabular-nums text-ink">{value}</p>
      <p className="mt-2 text-[13px] text-ink">
        {change ? (
          <>
            <span className="tabular-nums">{change.text}</span> <span className="font-light text-ink-soft">{changeSuffix}</span>
          </>
        ) : (
          <span className="font-light text-ink-faint">No prior month</span>
        )}
      </p>
      {hint ? <p className="mt-1 text-xs font-light text-ink-soft">{hint}</p> : null}
    </div>
  );
}
