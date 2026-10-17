/** SampleDataPill — always visible while the site is in demo mode. */
export function SampleDataPill(): React.JSX.Element {
  return (
    <span
      title="All figures are fictional sample data"
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-medium text-accent-deep"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-deep" />
      Sample data
      <span className="sr-only">: all figures are fictional sample data</span>
    </span>
  );
}
