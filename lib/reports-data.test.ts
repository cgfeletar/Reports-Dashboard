// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadReports } from "./reports-source";
import { addOnAttachRateSeries, categoryMixForMonth, previousMonthKey, rankCategories, studioGuestsSeries } from "./reports-transform";

const reports = loadReports({ root: "reports" });

describe("real reports/ reconciliation", () => {
  it("loads 12 months, oldest first, with no gaps", () => {
    expect(reports).toHaveLength(12);
    expect(reports[0]?.month).toBe("2025-10");
    expect(reports.at(-1)?.month).toBe("2026-09");
    for (const r of reports) {
      expect(r.sales).not.toBeNull();
      expect(r.categories).not.toBeNull();
      expect(r.items).not.toBeNull();
      expect(r.providers).not.toBeNull();
      expect(r.clients).not.toBeNull();
      expect(r.rebooking).not.toBeNull();
      expect(r.memberships).not.toBeNull();
    }
  });

  describe.each(reports.map((r) => [r.month, r] as const))("%s", (_month, r) => {
    const s = r.sales!;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

    it("category sub-totals sum to service + retail sales", () => {
      const service = sum(r.categories!.filter((c) => c.group === "Service").map((c) => c.subTotal));
      const retail = sum(r.categories!.filter((c) => c.group === "Retail").map((c) => c.subTotal));
      expect(service).toBeCloseTo(s.serviceSales!, 2);
      expect(retail).toBeCloseTo(s.retailSales!, 2);
    });

    it("provider service sales sum to service sales; retail to retail sales", () => {
      expect(sum(r.providers!.map((p) => p.serviceSales))).toBeCloseTo(s.serviceSales!, 2);
      expect(sum(r.providers!.map((p) => p.retailSales))).toBeCloseTo(s.retailSales!, 2);
    });

    it("provider appointments sum to rebooking total appointments", () => {
      expect(sum(r.providers!.map((p) => p.appointments))).toBe(r.rebooking!.totalAppointments);
    });

    it("net sales follow the formula", () => {
      const net =
        s.serviceSales! + s.retailSales! + s.membershipRevenue! + s.giftCardSales! - s.discounts! - s.refunds! - s.giftCardRedemptions! - s.processingFees!;
      expect(net).toBeCloseTo(s.netSales!, 2);
    });

    it("clients, rebooking and memberships are internally consistent", () => {
      expect(r.clients!.newClients + r.clients!.returningClients).toBe(r.clients!.totalClients);
      expect(r.rebooking!.rebooked + r.rebooking!.notRebooked).toBe(r.rebooking!.totalAppointments);
      const m = r.memberships!;
      expect(m.activeStart + m.newMembers - m.cancelled).toBe(m.activeEnd);
      expect(m.membershipRevenue).toBeCloseTo(s.membershipRevenue!, 2);
    });
  });
});

describe("transforms on real data", () => {
  it("loaded months are consecutive calendar months", () => {
    reports.forEach((r, i) => {
      if (i > 0) expect(previousMonthKey(r.month)).toBe(reports[i - 1]?.month);
    });
  });

  it("studio guests match the Self-guided provider's appointments", () => {
    const guests = studioGuestsSeries(reports);
    reports.forEach((r, i) => {
      const studio = r.providers!.find((p) => p.role === "Self-guided")!;
      expect(guests[i]?.guests).toBe(studio.appointments);
    });
  });

  it("add-on attach rate is a sane fraction", () => {
    for (const row of addOnAttachRateSeries(reports)) {
      expect(row["rate"]).toBeGreaterThan(0);
      expect(row["rate"]).toBeLessThan(1);
    }
  });

  it("service donut covers the whole month with 6 ranked + Other", () => {
    const ranked = rankCategories(reports, "Service");
    expect(ranked).toHaveLength(6);
    for (const r of reports) {
      const { slices, total } = categoryMixForMonth(r, "Service", ranked);
      expect(slices.reduce((a, s) => a + s.value, 0)).toBeCloseTo(total!, 2);
    }
  });
});
