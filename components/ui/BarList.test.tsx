import { render, screen, within } from "@testing-library/react";
import { BarList } from "./BarList";

const items = [
  { id: "a", name: "Alpha", meta: "Esthetician", value: 200, valueLabel: "$200", detail: "detail a" },
  { id: "b", name: "Beta", value: 50, valueLabel: "$50" },
];

describe("BarList", () => {
  it("renders an ordered, labelled list in the given order", () => {
    render(<BarList items={items} label="Team" />);
    const list = screen.getByRole("list", { name: "Team" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Alpha");
    expect(rows[0]).toHaveTextContent("Esthetician");
    expect(rows[0]).toHaveTextContent("detail a");
    expect(rows[1]).toHaveTextContent("$50");
  });

  it("sizes bars proportionally to the max value", () => {
    render(<BarList items={items} label="Team" />);
    const fills = screen.getAllByTestId("bar-fill");
    expect(fills[0]).toHaveStyle({ width: "100%" });
    expect(fills[1]).toHaveStyle({ width: "25%" });
  });

  it("handles all-zero values without NaN widths", () => {
    render(<BarList items={[{ id: "z", name: "Z", value: 0, valueLabel: "$0" }]} label="Z" />);
    expect(screen.getByTestId("bar-fill")).toHaveStyle({ width: "0%" });
  });

  it("is a single column by default", () => {
    render(<BarList items={items} label="Team" />);
    expect(screen.getByRole("list", { name: "Team" })).not.toHaveClass("lg:columns-2");
    expect(screen.getAllByRole("listitem")[0]).not.toHaveClass("break-inside-avoid");
  });

  it("flows into two columns at lg with unbroken items when columns={2}", () => {
    render(<BarList items={items} label="Team" columns={2} />);
    expect(screen.getByRole("list", { name: "Team" })).toHaveClass("lg:columns-2", "lg:gap-x-10");
    for (const li of screen.getAllByRole("listitem")) expect(li).toHaveClass("break-inside-avoid");
  });
});
