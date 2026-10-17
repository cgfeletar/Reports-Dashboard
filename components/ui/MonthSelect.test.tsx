import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthSelect } from "./MonthSelect";

const months = [
  { value: "2026-09", label: "September 2026" },
  { value: "2026-08", label: "August 2026" },
];

beforeAll(() => {
  // jsdom lacks these; Radix Select calls them when opening.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

describe("MonthSelect", () => {
  it("renders the Month label and current value on a labelled trigger", () => {
    render(<MonthSelect months={months} value="2026-09" onValueChange={() => {}} />);
    expect(screen.getByText("Month")).toBeInTheDocument();
    const trigger = screen.getByRole("combobox", { name: "Month" });
    expect(trigger).toHaveTextContent("September 2026");
  });

  it("calls onValueChange when another month is picked", async () => {
    const onChange = vi.fn();
    render(<MonthSelect months={months} value="2026-09" onValueChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Month" }));
    await userEvent.click(await screen.findByRole("option", { name: "August 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-08");
  });
});
