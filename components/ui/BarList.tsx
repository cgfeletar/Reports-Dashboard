export interface BarListItem {
  id: string;
  name: string;
  meta?: string;
  value: number;
  valueLabel: string;
  detail?: string;
}

interface BarListProps {
  items: BarListItem[];
  label: string;
}

/** BarList — Classification: WRITE NEW. Semantic HTML/CSS ranked list; bar is decorative. */
export function BarList({ items, label }: BarListProps): React.JSX.Element {
  const max = Math.max(0, ...items.map((i) => i.value));

  return (
    <ol aria-label={label} className="m-0 flex list-none flex-col gap-5 p-0">
      {items.map((item) => {
        const pct = max > 0 ? Math.max(0, (item.value / max) * 100) : 0;
        return (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-sm text-ink">
                <span className="font-medium">{item.name}</span>
                {item.meta ? <span className="font-light text-ink-soft"> · {item.meta}</span> : null}
              </p>
              <p className="shrink-0 text-sm font-medium tabular-nums text-ink">{item.valueLabel}</p>
            </div>
            <div aria-hidden="true" data-testid="bar-track" className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-accent-tint">
              <div data-testid="bar-fill" className="h-full rounded-full bg-accent-deep" style={{ width: `${pct}%` }} />
            </div>
            {item.detail ? <p className="mt-1.5 text-xs font-light text-ink-soft">{item.detail}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
