import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "./DashboardHeader";

const props = { eyebrow: "Spa", title: "Monthly Reports", subtitle: "Sub" };

describe("DashboardHeader", () => {
  it("shows the sample data pill in demo mode", () => {
    render(<DashboardHeader {...props} isDemo />);
    expect(screen.getByRole("heading", { level: 1, name: "Monthly Reports" })).toBeInTheDocument();
    expect(screen.getByText("Sample data")).toBeInTheDocument();
    expect(screen.getByText(/fictional sample data/)).toBeInTheDocument();
  });

  it("omits the pill otherwise", () => {
    render(<DashboardHeader {...props} isDemo={false} />);
    expect(screen.queryByText("Sample data")).not.toBeInTheDocument();
  });
});
