import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NO_CHANGE_TEXT } from "@/components/ui/StatTile";
import { loadReports } from "@/lib/reports-source";
import { AtAGlance } from "./AtAGlance";
import { Dashboard } from "./Dashboard";

vi.mock("@/lib/use-reduced-motion", () => ({ useReducedMotion: () => true }));

const reports = loadReports();
const business = { name: "Test Spa", isDemo: true };

beforeAll(() => {
  // jsdom lacks these; Radix Select calls them when opening.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

describe("Dashboard", () => {
  it("renders header, demo pill, month select and all sections in order", () => {
    render(<Dashboard reports={reports} business={business} />);
    expect(screen.getByText("Wellness Spa")).toBeInTheDocument();
    expect(screen.getByText("Sample data")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveTextContent("September 2026");

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "At a glance",
      "Revenue",
      "Services",
      "Retreat Studio",
      expect.stringMatching(/retail/i),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    ]);
    expect(headings).toHaveLength(8);
    expect(screen.getByText("All figures are fictional sample data.")).toBeInTheDocument();
  });

  it("shows 8 stat tiles and updates them when the month changes", async () => {
    render(<Dashboard reports={reports} business={business} />);
    const glance = screen.getByRole("region", { name: "At a glance" });
    expect(within(glance).getAllByText(/^(Net sales|Service sales|Retail sales|Clients served|Rebooking rate|Active members|Average spend per client|Team utilization)$/)).toHaveLength(8);
    const before = glance.textContent;

    await userEvent.click(screen.getByRole("combobox", { name: "Month" }));
    await userEvent.click(await screen.findByRole("option", { name: "August 2026" }));

    expect(screen.getByRole("combobox", { name: "Month" })).toHaveTextContent("August 2026");
    expect(screen.getByRole("region", { name: "At a glance" }).textContent).not.toBe(before);
  });
});

describe("AtAGlance", () => {
  it("says there is no prior month for the first month", () => {
    const first = reports[0];
    if (!first) throw new Error("no reports");
    render(<AtAGlance reports={reports} selectedMonth={first.month} />);
    expect(screen.getAllByText(NO_CHANGE_TEXT).length).toBeGreaterThan(0);
  });
});
