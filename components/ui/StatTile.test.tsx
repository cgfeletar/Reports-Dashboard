import { render, screen } from "@testing-library/react";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("renders value, change text, default suffix and hint", () => {
    render(<StatTile label="Net sales" value="$12,294" change={{ direction: "up", text: "▲ +12%" }} hint="note" />);
    expect(screen.getByText("Net sales")).toBeInTheDocument();
    expect(screen.getByText("$12,294")).toBeInTheDocument();
    expect(screen.getByText("▲ +12%")).toBeInTheDocument();
    expect(screen.getByText("vs. last month")).toBeInTheDocument();
    expect(screen.getByText("note")).toBeInTheDocument();
  });

  it("honours a custom suffix", () => {
    render(<StatTile label="L" value="1" change={{ direction: "down", text: "▼ -2%" }} changeSuffix="vs. Sep" />);
    expect(screen.getByText("vs. Sep")).toBeInTheDocument();
  });

  it("shows the empty state when change is null", () => {
    render(<StatTile label="L" value="1" change={null} />);
    expect(screen.getByText("No prior month")).toBeInTheDocument();
    expect(screen.queryByText("vs. last month")).not.toBeInTheDocument();
  });
});
