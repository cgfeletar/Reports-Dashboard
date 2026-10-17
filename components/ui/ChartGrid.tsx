import { Children } from "react";

interface GridProps {
  children: React.ReactNode;
  className?: string;
}

export const fullWidthClass = "md:col-span-2";

export function ChartGrid({ children, className }: GridProps): React.JSX.Element {
  return <div className={`grid grid-cols-1 gap-[22px] md:grid-cols-2 ${className ?? ""}`}>{children}</div>;
}

/**
 * Column span (of a 6-column lg grid) for tile `index` of `count`: thirds,
 * except a ragged last row stretches so no hole is left.
 */
export function tileSpanClass(index: number, count: number): string {
  const remainder = count % 3;
  const lastRowStart = count - remainder;
  if (remainder === 1 && index === count - 1) return "lg:col-span-6";
  if (remainder === 2 && index >= lastRowStart) return "lg:col-span-3";
  return "lg:col-span-2";
}

export function TileGrid({ children, className }: GridProps): React.JSX.Element {
  const tiles = Children.toArray(children);
  return (
    <div className={`grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-6 ${className ?? ""}`}>
      {tiles.map((tile, i) => (
        <div key={i} className={`flex min-w-0 *:flex-1 ${tileSpanClass(i, tiles.length)}`}>
          {tile}
        </div>
      ))}
    </div>
  );
}
