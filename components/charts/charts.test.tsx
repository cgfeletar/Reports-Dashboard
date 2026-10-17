import { render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { DonutChart } from "./DonutChart";
import { GroupedBarChart } from "./GroupedBarChart";
import { MonthlyBarChart } from "./MonthlyBarChart";
import { MonthlyLineChart } from "./MonthlyLineChart";
import { SmallMultiples } from "./SmallMultiples";
import { StackedBarChart } from "./StackedBarChart";
import { MONTHS, row, SERIES } from "./fixtures";
import { roundedTopPath, topSegmentKey, yAxisConfig } from "./shared";

// Animations start from zero-height bars; jump straight to the final frame.
vi.mock("@/lib/use-reduced-motion", () => ({ useReducedMotion: () => true }));

vi.mock("recharts", async (orig) => {
  const actual = await orig<typeof import("recharts")>();
  return {
    ...actual,
    // Fixed size so charts lay out in jsdom.
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 600, height: 300 }),
  };
});

const entry = (name: string, value: number | null, color = "#123456", payload?: unknown) => ({
  name,
  value,
  color,
  payload,
});

describe("topSegmentKey", () => {
  it("returns the topmost non-zero segment", () => {
    expect(topSegmentKey(row("2025-10", { a: 5, b: 3 }), SERIES)).toBe("b");
    expect(topSegmentKey(row("2025-10", { a: 5, b: 0 }), SERIES)).toBe("a");
    expect(topSegmentKey(row("2025-10", { a: 5, b: null }), SERIES)).toBe("a");
  });
  it("returns null for an empty stack", () => {
    expect(topSegmentKey(row("2025-10", { a: 0, b: null }), SERIES)).toBeNull();
    expect(topSegmentKey(undefined, SERIES)).toBeNull();
  });
});

describe("roundedTopPath", () => {
  it("clamps the radius to the bar size", () => {
    expect(roundedTopPath(0, 0, 40, 2, 4)).toContain("Q0,0 2,0");
  });
});

describe("yAxisConfig", () => {
  it("uses niceTicks and a matching domain", () => {
    const y = yAxisConfig({ max: 90, valueKind: "currency" });
    expect(y.domain).toEqual([0, y.ticks.at(-1)]);
    expect(y.tickFormatter(1000)).toBe("$1k");
  });
  it("uses a fixed 0-100% axis", () => {
    const y = yAxisConfig({ max: 0.3, valueKind: "percent", percentAxis: true });
    expect(y.domain).toEqual([0, 1]);
    expect(y.tickFormatter(0.25)).toBe("25%");
  });
  it("shows a decimal for fine rate ticks", () => {
    const y = yAxisConfig({ max: 0.05, valueKind: "percent" });
    expect(y.ticks.map(y.tickFormatter).join(",")).toContain(".");
  });
});

describe("ChartTooltip", () => {
  const payload = [entry("Alpha", 100, "#111", MONTHS[0]), entry("Beta", 50, "#222", MONTHS[0])];

  it("renders a long month header and full values", () => {
    render(<ChartTooltip active payload={payload} label="2025-10" valueKind="currency" />);
    expect(screen.getByText("October 2025")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reverses order and adds a total", () => {
    render(<ChartTooltip active payload={payload} label="2025-10" valueKind="count" reverse total />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Beta");
    expect(items[1]).toContain("Alpha");
    expect(screen.getByText("Total").parentElement).toHaveTextContent("150");
  });

  it("shows a footer and an em dash for null", () => {
    render(
      <ChartTooltip
        active
        payload={[entry("Alpha", null, "#111", MONTHS[0])]}
        label="2025-10"
        valueKind="count"
        footer={() => "New: 18% of total"}
      />,
    );
    expect(screen.getByText("New: 18% of total")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders nothing when inactive", () => {
    const { container } = render(<ChartTooltip payload={payload} valueKind="count" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChartLegend", () => {
  it("lists every series", () => {
    render(<ChartLegend items={SERIES} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("DonutChart", () => {
  it("shows center text and $ and % in the legend", () => {
    render(
      <DonutChart
        centerLabel="Service sales"
        centerValue="$10,000"
        slices={[
          { key: "a", name: "Facials", value: 7500, color: "#111" },
          { key: "b", name: "Massage", value: 2500, color: "#222" },
        ]}
      />,
    );
    expect(screen.getByText("$10,000")).toBeInTheDocument();
    expect(screen.getByText("$7,500")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});

describe("chart smoke renders", () => {
  it("MonthlyBarChart", () => {
    const { container } = render(
      <MonthlyBarChart data={MONTHS} series={SERIES[0]!} selectedMonth="2025-12" valueKind="currency" showValueLabels />,
    );
    const bars = container.querySelectorAll("path[fill='#111111']");
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAttribute("fill-opacity", "0.6");
    expect(bars[1]).toHaveAttribute("fill-opacity", "1");
    expect(container.querySelector("svg")?.textContent).toContain("$250");
    // The zero month gets no label.
    expect(container.querySelectorAll("text[font-weight]")).toHaveLength(2);
  });
  it("StackedBarChart has a legend, top segment first", () => {
    render(<StackedBarChart data={MONTHS} series={SERIES} selectedMonth="2025-12" valueKind="count" />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Beta", "Alpha"]);
  });
  it("GroupedBarChart", () => {
    const { container } = render(
      <GroupedBarChart data={MONTHS} series={SERIES} selectedMonth="2025-12" valueKind="count" />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
  it("MonthlyLineChart shows a legend only with 2+ series", () => {
    const one = render(<MonthlyLineChart data={MONTHS} series={[SERIES[0]!]} selectedMonth="2025-12" valueKind="percent" percentAxis />);
    expect(one.queryAllByRole("listitem")).toHaveLength(0);
    one.unmount();
    render(<MonthlyLineChart data={MONTHS} series={SERIES} selectedMonth="2025-12" valueKind="count" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
  it("SmallMultiples renders an h4 per panel", () => {
    const panels = [
      { id: "p1", title: "Facials", data: MONTHS },
      { id: "p2", title: "Massage", data: MONTHS },
    ];
    for (const kind of ["bar", "line"] as const) {
      const { unmount } = render(
        <SmallMultiples
          panels={panels}
          valueKey="a"
          kind={kind}
          valueKind="currency"
          selectedMonth="2025-12"
          sharedScale
          labelUnitsKey="u"
          columns="sm2"
        />,
      );
      expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(2);
      unmount();
    }
  });
});
