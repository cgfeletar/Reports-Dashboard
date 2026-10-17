import { render } from "@testing-library/react";
import { TileGrid, tileSpanClass } from "./ChartGrid";

const spans = (count: number): string[] => Array.from({ length: count }, (_, i) => tileSpanClass(i, count));

describe("tileSpanClass", () => {
  it("fills 8 tiles with no hole", () => {
    expect(spans(8)).toEqual([...Array(6).fill("lg:col-span-2"), "lg:col-span-3", "lg:col-span-3"]);
  });
  it("leaves multiples of three alone and stretches a lone last tile", () => {
    expect(spans(6).every((c) => c === "lg:col-span-2")).toBe(true);
    expect(spans(7).at(-1)).toBe("lg:col-span-6");
  });
});

describe("TileGrid", () => {
  it("wraps each child in a spanning cell", () => {
    const { container } = render(
      <TileGrid>
        {Array.from({ length: 5 }, (_, i) => (
          <p key={i}>t{i}</p>
        ))}
      </TileGrid>,
    );
    const cells = [...container.firstElementChild!.children];
    expect(cells).toHaveLength(5);
    expect(cells[4]).toHaveClass("lg:col-span-3");
    expect(cells[0]).toHaveClass("lg:col-span-2");
  });
});
