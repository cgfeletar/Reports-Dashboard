interface GridProps {
  children: React.ReactNode;
  className?: string;
}

export const fullWidthClass = "md:col-span-2";

export function ChartGrid({ children, className }: GridProps): React.JSX.Element {
  return <div className={`grid grid-cols-1 gap-[22px] md:grid-cols-2 ${className ?? ""}`}>{children}</div>;
}

export function TileGrid({ children, className }: GridProps): React.JSX.Element {
  return <div className={`grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3 ${className ?? ""}`}>{children}</div>;
}
