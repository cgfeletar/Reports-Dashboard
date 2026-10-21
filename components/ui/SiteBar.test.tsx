import { render, screen } from "@testing-library/react";
import { BOOK_CALL, SITE_HOME, SiteBar } from "./SiteBar";

describe("SiteBar", () => {
  it("links the name home and the button to booking, both absolute", () => {
    render(<SiteBar />);
    expect(screen.getByRole("link", { name: /Caitlyn Feletar/ })).toHaveAttribute("href", SITE_HOME);
    expect(screen.getByRole("link", { name: "Book a call" })).toHaveAttribute("href", BOOK_CALL);
  });
});
