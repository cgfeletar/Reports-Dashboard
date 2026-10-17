import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartCard } from "./ChartCard";

const table = { columns: ["Month", "Sales"], rows: [["Oct", "$1"], ["Nov", "$2"]] };

describe("ChartCard", () => {
  it("toggles the table with hidden/aria-expanded and aria-controls targets a real element", async () => {
    const { container } = render(
      <ChartCard title="Net sales" subtitle="By month" table={table}>
        <div>chart</div>
      </ChartCard>,
    );
    const btn = screen.getByRole("button", { name: "View data" });
    const target = container.querySelector(`[id="${btn.getAttribute("aria-controls")}"]`);
    expect(target).toBeInTheDocument();
    expect(target).toHaveAttribute("hidden");
    expect(btn).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(btn);
    expect(target).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Hide data" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("rowheader", { name: "Oct" })).toBeInTheDocument();
  });

  it("renders title, children and a figcaption falling back to subtitle", () => {
    render(
      <ChartCard title="Net sales" subtitle="By month" table={table}>
        <div>chart</div>
      </ChartCard>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Net sales" })).toBeInTheDocument();
    expect(screen.getByText("chart")).toBeInTheDocument();
    expect(screen.getByRole("figure").querySelector("figcaption")).toHaveTextContent("By month");
  });

  it("prefers an explicit caption", () => {
    render(
      <ChartCard title="T" subtitle="S" caption="Custom caption" table={table}>
        <div />
      </ChartCard>,
    );
    expect(screen.getByRole("figure").querySelector("figcaption")).toHaveTextContent("Custom caption");
  });
});
