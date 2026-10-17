import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { labelsFit, monthTick, monthTickParts, tickLayout } from "./ticks";

describe("monthTickParts", () => {
  it("adds the year on the first tick and on January only", () => {
    expect(monthTickParts("2025-03", 0)).toEqual({ month: "Mar", year: "'25" });
    expect(monthTickParts("2026-01", 5)).toEqual({ month: "Jan", year: "'26" });
    expect(monthTickParts("2025-10", 3)).toEqual({ month: "Oct", year: null });
  });
});

describe("tickLayout", () => {
  it("stays flat when wide or unmeasured", () => {
    expect(tickLayout(null)).toEqual({ angled: false, angle: 0, height: 34 });
    expect(tickLayout(24)).toEqual({ angled: false, angle: 0, height: 34 });
  });
  it("angles when the slot is narrow", () => {
    expect(tickLayout(23)).toEqual({ angled: true, angle: -45, height: 44 });
    expect(tickLayout(21, true)).toEqual({ angled: false, angle: 0, height: 34 });
    expect(tickLayout(19, true).angled).toBe(true);
  });
  it("tilts further when even -45° neighbours would touch", () => {
    expect(tickLayout(17)).toEqual({ angled: true, angle: -60, height: 48 });
  });
});

describe("labelsFit", () => {
  it("needs more room for two-line labels", () => {
    expect(labelsFit(null, true)).toBe(true);
    expect(labelsFit(29, true)).toBe(false);
    expect(labelsFit(29, false)).toBe(true);
    expect(labelsFit(25, false)).toBe(false);
  });
});

describe("monthTick", () => {
  const renderTick = (value: string, index: number, angled = false) => {
    const Tick = monthTick({ angled, angle: angled ? -45 : 0, height: 34 });
    return render(
      <svg>
        <Tick x={10} y={5} index={index} payload={{ value }} />
      </svg>,
    ).container;
  };

  it("renders a second line with the year on the first tick and January", () => {
    expect(renderTick("2025-10", 0).querySelectorAll("tspan")).toHaveLength(2);
    const jan = renderTick("2026-01", 4);
    expect([...jan.querySelectorAll("tspan")].map((t) => t.textContent)).toEqual(["Jan", "'26"]);
  });
  it("renders one line for other months", () => {
    expect(renderTick("2025-11", 2).querySelectorAll("tspan")).toHaveLength(1);
  });
  it("rotates when angled", () => {
    const text = renderTick("2025-11", 2, true).querySelector("text");
    expect(text).toHaveAttribute("transform", "rotate(-45 10 5)");
    expect(text).toHaveAttribute("text-anchor", "end");
  });
});
