import { render, screen, within } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { loadReports } from "@/lib/reports-source";
import type { MonthReport } from "@/lib/reports-types";
import { ClientsSection } from "./ClientsSection";
import { InsightsSection } from "./InsightsSection";
import { RetailSection } from "./RetailSection";
import { TeamSection } from "./TeamSection";

// Bars never render in jsdom unless animation jumps to the final frame.
vi.mock("@/lib/use-reduced-motion", () => ({ useReducedMotion: () => true }));

vi.mock("recharts", async (orig) => {
  const actual = await orig<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
      cloneElement(children, { width: 600, height: 300 }),
  };
});

const reports = loadReports();
const latest = reports[reports.length - 1]!;
const month = latest.month;

const gapReport: MonthReport = {
  month: "2099-01",
  sales: null,
  categories: null,
  items: null,
  providers: null,
  clients: null,
  rebooking: null,
  memberships: null,
};
const withGap = [...reports, gapReport];

const sections = [
  { name: "Retail", id: "retail", Component: RetailSection },
  { name: "Clients & loyalty", id: "clients", Component: ClientsSection },
  { name: "Team", id: "team", Component: TeamSection },
  { name: "Insights", id: "insights", Component: InsightsSection },
] as const;

describe.each(sections)("$name section", ({ name, id, Component }) => {
  it("renders its heading", () => {
    render(<Component reports={reports} selectedMonth={month} />);
    expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    expect(document.getElementById(id)).not.toBeNull();
  });

  it("renders with a month that has no files", () => {
    render(<Component reports={withGap} selectedMonth="2099-01" />);
    expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
  });
});

describe("TeamSection", () => {
  it("lists only staffed providers", () => {
    render(<TeamSection reports={reports} selectedMonth={month} />);
    const list = screen.getByRole("list", { name: /service sales by provider/i });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("Retreat Studio");
    expect(document.body.textContent).not.toContain("Front Desk");
  });
});

describe("InsightsSection", () => {
  it("shows at most 10 services in descending order", () => {
    render(<InsightsSection reports={reports} selectedMonth={month} />);
    const list = screen.getByRole("list", { name: /top services/i });
    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBeLessThanOrEqual(10);
    const dollars = items.map((li) => {
      const m = /\$[\d,]+/.exec(li.textContent ?? "");
      return Number((m?.[0] ?? "").replace(/[^0-9]/g, ""));
    });
    expect(dollars.length).toBeGreaterThan(0);
    expect([...dollars].sort((a, b) => b - a)).toEqual(dollars);
  });
});

describe("gaps", () => {
  it("shows an em dash, not 0, for a month without client files", () => {
    render(<ClientsSection reports={withGap} selectedMonth="2099-01" />);
    const [table] = screen.getAllByRole("table", { hidden: true });
    const gapRow = within(table!).getByRole("rowheader", { name: /January 2099/, hidden: true }).closest("tr")!;
    const cells = within(gapRow).getAllByRole("cell", { hidden: true });
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(c).toHaveTextContent("—");
  });

  it("shows gaps in the team table for a month without providers", () => {
    render(<TeamSection reports={withGap} selectedMonth="2099-01" />);
    const tables = screen.getAllByRole("table", { hidden: true });
    const util = tables[tables.length - 1]!;
    const gapRow = within(util).getByRole("rowheader", { name: /January 2099/, hidden: true }).closest("tr")!;
    for (const c of within(gapRow).getAllByRole("cell", { hidden: true })) expect(c).toHaveTextContent("—");
  });
});
