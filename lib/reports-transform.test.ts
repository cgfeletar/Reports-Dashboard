// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CATEGORICAL, OTHER_COLOR, OTHER_LABEL } from "./chart-theme";
import {
  CLIENT_SERIES,
  GIFT_CARD_SERIES,
  MEMBERSHIP_SERIES,
  REVENUE_MIX_SERIES,
  addOnAttachRateSeries,
  avgSpendSeries,
  buildKpis,
  categoryMixForMonth,
  categorySalesSeries,
  categorySeries,
  categoryUnitsPanels,
  previousMonthKey,
  retailPerClientSeries,
  clientsSeries,
  discountRateSeries,
  giftCardSeries,
  isStaffProvider,
  membershipSeries,
  netSalesSeries,
  rankCategories,
  rebookingRateSeries,
  revenueMixSeries,
  studioGuestsSeries,
  teamPerformance,
  topServices,
  utilizationPanels,
} from "./reports-transform";
import type { CategorySale, ItemSale, MonthReport, ProviderSale, SalesSummary } from "./reports-types";

const empty = (month: string): MonthReport => ({
  month,
  sales: null,
  categories: null,
  items: null,
  providers: null,
  clients: null,
  rebooking: null,
  memberships: null,
});

const sales = (o: Partial<SalesSummary> = {}): SalesSummary => ({
  serviceSales: 1000,
  retailSales: 200,
  membershipRevenue: 300,
  giftCardSales: 50,
  discounts: 120,
  refunds: 0,
  giftCardRedemptions: 10,
  processingFees: 20,
  netSales: 1400,
  ...o,
});

const cat = (category: string, group: "Service" | "Retail", units: number, subTotal: number): CategorySale => ({
  category,
  group,
  units,
  subTotal,
  discount: 0,
});

const item = (o: Partial<ItemSale> & { item: string }): ItemSale => ({
  category: "Facials",
  group: "Service",
  isAddOn: false,
  units: 1,
  subTotal: 0,
  discount: 0,
  net: 0,
  ...o,
});

const provider = (o: Partial<ProviderSale> & { provider: string }): ProviderSale => ({
  role: "Esthetician",
  appointments: 10,
  hoursBooked: 8,
  hoursAvailable: 10,
  serviceSales: 100,
  retailSales: 0,
  rebooked: 5,
  ...o,
});

describe("isStaffProvider", () => {
  it("excludes Self-guided and Front Desk", () => {
    expect(isStaffProvider({ role: "Esthetician" })).toBe(true);
    expect(isStaffProvider({ role: "Self-guided" })).toBe(false);
    expect(isStaffProvider({ role: " front desk " })).toBe(false);
  });
});

describe("buildKpis", () => {
  const a: MonthReport = {
    ...empty("2026-01"),
    sales: sales({ netSales: 1000, serviceSales: 800, retailSales: 100 }),
    clients: { newClients: 10, returningClients: 40, totalClients: 50 },
    rebooking: { rebooked: 40, notRebooked: 60, totalAppointments: 100 },
    memberships: { activeStart: 10, newMembers: 3, cancelled: 1, activeEnd: 12, membershipRevenue: 300 },
    providers: [
      provider({ provider: "A", hoursBooked: 8, hoursAvailable: 10 }),
      provider({ provider: "Studio", role: "Self-guided", hoursBooked: 0, hoursAvailable: 0 }),
      provider({ provider: "Desk", role: "Front Desk", hoursBooked: 100, hoursAvailable: 100 }),
    ],
  };
  const b: MonthReport = {
    ...a,
    month: "2026-02",
    sales: sales({ netSales: 1200, serviceSales: 900, retailSales: 150 }),
    clients: { newClients: 12, returningClients: 48, totalClients: 60 },
    rebooking: { rebooked: 60, notRebooked: 40, totalAppointments: 100 },
    providers: [provider({ provider: "A", hoursBooked: 9, hoursAvailable: 10 })],
  };

  it("computes values, previous month and change kinds", () => {
    const k = buildKpis([a, b], "2026-02");
    expect(k.netSales).toEqual({ value: 1200, previous: 1000, changeKind: "relative" });
    expect(k.serviceSales.previous).toBe(800);
    expect(k.retailSales.value).toBe(150);
    expect(k.clients.value).toBe(60);
    expect(k.rebookingRate).toEqual({ value: 0.6, previous: 0.4, changeKind: "points" });
    expect(k.activeMembers.value).toBe(12);
    expect(k.avgSpend.value).toBe(20);
    expect(k.avgSpend.previous).toBe(20);
    expect(k.utilization).toEqual({ value: 0.9, previous: 0.8, changeKind: "points" });
    expect(k.hints).toEqual({ retailPerClient: 2.5, newClients: 12, newMembers: 3, cancelled: 1 });
  });

  it("has a null previous for the first month", () => {
    const k = buildKpis([a, b], "2026-01");
    expect(k.netSales.previous).toBeNull();
    expect(k.utilization.previous).toBeNull();
    expect(k.utilization.value).toBe(0.8); // staff only
  });

  it("compares with the previous calendar month, not the previous array element", () => {
    const jan = { ...a, month: "2026-01" };
    const mar = { ...b, month: "2026-03" };
    expect(buildKpis([jan, mar], "2026-03").netSales.previous).toBeNull();
    const dec = { ...a, month: "2025-12" };
    expect(buildKpis([dec, jan], "2026-01").netSales.previous).toBe(1000);
  });

  it("returns nulls for unknown months or missing data", () => {
    const none = buildKpis([a], "1999-01");
    expect(none.netSales.value).toBeNull();
    expect(none.hints.newClients).toBeNull();
    const gaps = buildKpis([empty("2026-01")], "2026-01");
    expect(gaps.utilization.value).toBeNull();
    expect(gaps.avgSpend.value).toBeNull();
    expect(gaps.hints.retailPerClient).toBeNull();
  });

  it("handles zero denominators", () => {
    const z: MonthReport = {
      ...empty("2026-01"),
      clients: { newClients: 0, returningClients: 0, totalClients: 0 },
      sales: sales(),
      providers: [provider({ provider: "A", hoursAvailable: 0, hoursBooked: 0 })],
    };
    const k = buildKpis([z], "2026-01");
    expect(k.avgSpend.value).toBeNull();
    expect(k.utilization.value).toBeNull();
  });
});

describe("revenue series", () => {
  const r1 = { ...empty("2026-01"), sales: sales() };
  const r2 = empty("2026-02");
  const r3 = { ...empty("2026-03"), sales: sales({ giftCardSales: null, discounts: null }) };

  it("netSalesSeries keeps gaps as null", () => {
    expect(netSalesSeries([r1, r2])).toEqual([
      { month: "2026-01", net: 1400 },
      { month: "2026-02", net: null },
    ]);
  });

  it("revenueMixSeries is bottom to top with colors from CATEGORICAL", () => {
    expect(REVENUE_MIX_SERIES.map((s) => s.name)).toEqual(["Services", "Retail", "Memberships", "Gift card sales"]);
    expect(REVENUE_MIX_SERIES.map((s) => s.color)).toEqual(CATEGORICAL.slice(0, 4));
    expect(revenueMixSeries([r1, r2, r3])).toEqual([
      { month: "2026-01", services: 1000, retail: 200, memberships: 300, giftCards: 50 },
      { month: "2026-02", services: null, retail: null, memberships: null, giftCards: null },
      { month: "2026-03", services: 1000, retail: 200, memberships: 300, giftCards: null },
    ]);
  });

  it("discountRateSeries = discounts / (service + retail)", () => {
    const rows = discountRateSeries([r1, r2, r3, { ...empty("2026-04"), sales: sales({ serviceSales: 0, retailSales: 0 }) }]);
    expect(rows[0]?.rate).toBeCloseTo(0.1, 10);
    expect(rows[1]?.rate).toBeNull();
    expect(rows[2]?.rate).toBeNull();
    expect(rows[3]?.rate).toBeNull();
    const noRetail = discountRateSeries([{ ...empty("x"), sales: sales({ retailSales: null }) }]);
    expect(noRetail[0]?.rate).toBeNull();
  });

  it("avgSpendSeries = net / clients", () => {
    const rows = avgSpendSeries([
      { ...r1, clients: { newClients: 1, returningClients: 6, totalClients: 7 } },
      r1,
    ]);
    expect(rows[0]?.value).toBe(200);
    expect(rows[1]?.value).toBeNull();
  });
});

describe("previousMonthKey", () => {
  it("steps back one calendar month, across years", () => {
    expect(previousMonthKey("2026-03")).toBe("2026-02");
    expect(previousMonthKey("2026-01")).toBe("2025-12");
    expect(previousMonthKey("2026-11")).toBe("2026-10");
  });
  it("is null for malformed keys", () => {
    expect(previousMonthKey("2026-13")).toBeNull();
    expect(previousMonthKey("nope")).toBeNull();
  });
});

describe("retailPerClientSeries", () => {
  it("divides retail sales by total clients, null when either is unknown or clients is 0", () => {
    const clients = (totalClients: number) => ({ newClients: 0, returningClients: totalClients, totalClients });
    const rows = retailPerClientSeries([
      { ...empty("2026-01"), sales: sales({ retailSales: 200 }), clients: clients(50) },
      { ...empty("2026-02"), sales: sales({ retailSales: 200 }) },
      { ...empty("2026-03"), clients: clients(50) },
      { ...empty("2026-04"), sales: sales({ retailSales: 200 }), clients: clients(0) },
    ]);
    expect(rows.map((r) => r.value)).toEqual([4, null, null, null]);
  });
});

describe("category ranking and mix", () => {
  const services = (extra: CategorySale[] = []) => [
    cat("A", "Service", 10, 1000),
    cat("B", "Service", 5, 900),
    cat("C", "Service", 5, 800),
    cat("D", "Service", 5, 700),
    cat("E", "Service", 5, 600),
    cat("F", "Service", 5, 500),
    cat("G", "Service", 5, 400),
    cat("H", "Service", 5, 300),
    ...extra,
  ];
  const m1: MonthReport = { ...empty("2026-01"), categories: [...services(), cat("Skin", "Retail", 3, 90), cat("Nails", "Retail", 1, 30)] };
  const m2: MonthReport = { ...empty("2026-02"), categories: [...["B", "C", "D", "E", "F", "G", "H"].map((n) => cat(n, "Service", 1, 1)), cat("Skin", "Retail", 1, 10)] }; // A missing
  const m3 = empty("2026-03");
  const reports = [m1, m2, m3];

  it("ranks across all months, top n, with a stable name tiebreak", () => {
    const ranked = rankCategories(reports, "Service");
    expect(ranked).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(rankCategories(reports, "Service", 2)).toEqual(["A", "B"]);
    const ties: MonthReport = { ...empty("t"), categories: [cat("Zed", "Service", 1, 5), cat("Alpha", "Service", 1, 5)] };
    expect(rankCategories([ties], "Service")).toEqual(["Alpha", "Zed"]);
    expect(rankCategories(reports, "Retail")).toEqual(["Skin", "Nails"]);
  });

  it("categorySeries colors by rank and adds Other only when needed", () => {
    const ranked = rankCategories(reports, "Service");
    const series = categorySeries(reports, "Service", ranked);
    expect(series.map((s) => s.name)).toEqual(["A", "B", "C", "D", "E", "F", OTHER_LABEL]);
    expect(series.slice(0, 6).map((s) => s.color)).toEqual([...CATEGORICAL]);
    expect(series[6]?.color).toBe(OTHER_COLOR);
    expect(new Set(series.map((s) => s.key)).size).toBe(7);
    const retail = categorySeries(reports, "Retail", rankCategories(reports, "Retail"));
    expect(retail.map((s) => s.name)).toEqual(["Skin", "Nails"]);
  });

  it("donut slices use the same color per category in every month, plus Other and shares", () => {
    const ranked = rankCategories(reports, "Service");
    const mix1 = categoryMixForMonth(m1, "Service", ranked);
    const mix2 = categoryMixForMonth(m2, "Service", ranked);
    expect(mix1.total).toBe(5200);
    expect(mix1.slices.map((s) => s.name)).toEqual(["A", "B", "C", "D", "E", "F", OTHER_LABEL]);
    expect(mix1.slices[6]).toMatchObject({ value: 700, color: OTHER_COLOR });
    expect(mix1.slices.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 10);
    expect(mix1.slices[0]?.share).toBeCloseTo(1000 / 5200, 10);
    // A is absent in m2: it is skipped, others keep their colors.
    expect(mix2.slices.map((s) => s.name)).toEqual(["B", "C", "D", "E", "F", OTHER_LABEL]);
    for (const slice of mix2.slices.slice(0, -1)) {
      expect(slice.color).toBe(mix1.slices.find((s) => s.name === slice.name)?.color);
    }
    // colors line up with the series config
    const series = categorySeries(reports, "Service", ranked);
    for (const slice of mix1.slices) expect(series.find((s) => s.key === slice.key)?.color).toBe(slice.color);
  });

  it("retail mix with <= 6 categories has no Other", () => {
    const mix = categoryMixForMonth(m1, "Retail", rankCategories(reports, "Retail"));
    expect(mix.slices.map((s) => s.name)).toEqual(["Skin", "Nails"]);
    expect(mix.total).toBe(120);
  });

  it("mix is empty with null total when the file is missing; share 0 when total is 0", () => {
    expect(categoryMixForMonth(m3, "Service", ["A"])).toEqual({ slices: [], total: null });
    const zero: MonthReport = { ...empty("z"), categories: [cat("A", "Service", 0, 0), cat("B", "Service", 0, 0)] };
    expect(categoryMixForMonth(zero, "Service", ["A"])).toEqual({ slices: [], total: 0 });
  });

  it("drops $0 slices, including an Other that sums to 0", () => {
    const r: MonthReport = {
      ...empty("z"),
      categories: [cat("A", "Service", 1, 100), cat("B", "Service", 1, 0), cat("C", "Service", 1, 0)],
    };
    expect(categoryMixForMonth(r, "Service", ["A", "B"]).slices.map((s) => s.name)).toEqual(["A"]);
  });

  it("categorySalesSeries is stacked by key with null rows for missing files", () => {
    const ranked = rankCategories(reports, "Service");
    const rows = categorySalesSeries(reports, "Service", ranked);
    expect(rows[0]).toMatchObject({ month: "2026-01", c0: 1000, c1: 900, c5: 500, other: 700 });
    expect(rows[1]).toMatchObject({ c0: 0, c1: 1 });
    expect(rows[2]).toMatchObject({ month: "2026-03", c0: null, other: null });
    const retail = categorySalesSeries(reports, "Retail", ["Skin", "Nails"]);
    expect(retail[0]).toEqual({ month: "2026-01", c0: 90, c1: 30 });
  });

  it("categoryUnitsPanels: one panel per category ordered by rank", () => {
    const panels = categoryUnitsPanels(reports, "Service");
    expect(panels.map((p) => p.title)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(panels[0]?.data).toEqual([
      { month: "2026-01", value: 10, units: 10 },
      { month: "2026-02", value: 0, units: 0 },
      { month: "2026-03", value: null, units: null },
    ]);
    expect(panels[0]?.color).toBe(CATEGORICAL[0]);
    expect(new Set(panels.map((p) => p.id)).size).toBe(panels.length);
  });

  it("categoryUnitsPanels excludeAddOns drops add-on-only categories but keeps rank colors", () => {
    const month: MonthReport = {
      ...empty("2026-01"),
      categories: [cat("Facials", "Service", 9, 900), cat("Add-ons", "Service", 4, 100), cat("Massage", "Service", 3, 50)],
      items: [
        item({ item: "Facial", category: "Facials" }),
        item({ item: "Boost", category: "Add-ons", isAddOn: true }),
        item({ item: "Hot stones", category: "Massage", isAddOn: true }),
        item({ item: "Swedish", category: "Massage" }),
      ],
    };
    const panels = categoryUnitsPanels([month], "Service", { excludeAddOns: true });
    expect(panels.map((p) => p.title)).toEqual(["Facials", "Massage"]);
    expect(panels[1]?.color).toBe(CATEGORICAL[2]);
    expect(categoryUnitsPanels([month], "Service")).toHaveLength(3);
  });

  it("excludeAddOns falls back to the category name when items are unknown", () => {
    const month: MonthReport = {
      ...empty("2026-01"),
      categories: [cat("Facials", "Service", 9, 900), cat("Add-On", "Service", 4, 100)],
    };
    expect(categoryUnitsPanels([month], "Service", { excludeAddOns: true }).map((p) => p.title)).toEqual(["Facials"]);
  });

  it("retail panels carry dollars in value and units separately", () => {
    const panels = categoryUnitsPanels(reports, "Retail");
    expect(panels[0]?.title).toBe("Skin");
    expect(panels[0]?.data[0]).toEqual({ month: "2026-01", value: 90, units: 3 });
    expect(panels[0]?.data[1]).toEqual({ month: "2026-02", value: 10, units: 1 });
    expect(panels[1]?.data[1]).toEqual({ month: "2026-02", value: 0, units: 0 });
  });
});

describe("addOnAttachRateSeries", () => {
  const items = [item({ item: "x", isAddOn: true, units: 5 }), item({ item: "y", isAddOn: true, units: 5, group: "Retail" }), item({ item: "z", units: 50 })];
  it("divides add-on units by rebooking appointments, falling back to providers", () => {
    const rows = addOnAttachRateSeries([
      { ...empty("2026-01"), items, rebooking: { rebooked: 0, notRebooked: 0, totalAppointments: 50 } },
      { ...empty("2026-02"), items, providers: [provider({ provider: "A", appointments: 10 }), provider({ provider: "B", appointments: 15 })] },
      { ...empty("2026-03"), items },
      { ...empty("2026-04"), rebooking: { rebooked: 0, notRebooked: 0, totalAppointments: 50 } },
      { ...empty("2026-05"), items, rebooking: { rebooked: 0, notRebooked: 0, totalAppointments: 0 } },
    ]);
    expect(rows[0]?.rate).toBeCloseTo(0.1, 10);
    expect(rows[1]?.rate).toBeCloseTo(0.2, 10);
    expect(rows[2]?.rate).toBeNull();
    expect(rows[3]?.rate).toBeNull();
    expect(rows[4]?.rate).toBeNull();
  });
});

describe("studioGuestsSeries", () => {
  const categories = [cat("Facials", "Service", 9, 1), cat("Sauna, Soak + Steam", "Service", 74, 1)];
  const items = [
    item({ item: "Soak", category: "Sauna, Soak + Steam", units: 60 }),
    item({ item: "Extra Hour", category: "Sauna, Soak + Steam", isAddOn: true, units: 14 }),
    item({ item: "Facial", category: "Facials", units: 9 }),
  ];
  it("counts non-add-on units when items exist, else category units; gaps stay null", () => {
    const rows = studioGuestsSeries([
      { ...empty("2026-01"), categories, items },
      { ...empty("2026-02"), categories },
      { ...empty("2026-03") },
      { ...empty("2026-04"), categories: [cat("Facials", "Service", 1, 1)] },
    ]);
    expect(rows.map((r) => r.guests)).toEqual([60, 74, null, 0]);
  });

  it("falls back to the Self-guided provider's appointments when items are missing, without spiking", () => {
    const studio = provider({ provider: "Studio", role: "Self-guided", appointments: 55 });
    const rows = studioGuestsSeries([
      { ...empty("2026-01"), categories, items, providers: [studio] },
      { ...empty("2026-02"), categories, providers: [studio] },
      { ...empty("2026-03"), providers: [provider({ provider: "A" })] },
    ]);
    expect(rows.map((r) => r.guests)).toEqual([60, 55, null]);
  });

  it("uses items and providers even when the category file is missing", () => {
    const studio = provider({ provider: "Studio", role: "Self-guided", appointments: 55 });
    const rows = studioGuestsSeries([
      { ...empty("2026-01"), items },
      { ...empty("2026-02"), providers: [studio] },
    ]);
    expect(rows.map((r) => r.guests)).toEqual([60, 55]);
  });
});

describe("clients, rebooking, memberships, gift cards", () => {
  const full: MonthReport = {
    ...empty("2026-01"),
    clients: { newClients: 10, returningClients: 40, totalClients: 50 },
    rebooking: { rebooked: 1, notRebooked: 3, totalAppointments: 4 },
    memberships: { activeStart: 5, newMembers: 2, cancelled: 1, activeEnd: 6, membershipRevenue: 1 },
    sales: sales({ giftCardSales: 70, giftCardRedemptions: 30 }),
  };
  const none = empty("2026-02");

  it("builds rows with null gaps and series in stack order", () => {
    expect(clientsSeries([full, none])).toEqual([
      { month: "2026-01", returning: 40, new: 10 },
      { month: "2026-02", returning: null, new: null },
    ]);
    expect(CLIENT_SERIES.map((s) => s.key)).toEqual(["returning", "new"]);
    expect(rebookingRateSeries([full, none]).map((r) => r.rate)).toEqual([0.25, null]);
    expect(membershipSeries([full, none])).toEqual([
      { month: "2026-01", active: 6, new: 2, cancelled: 1 },
      { month: "2026-02", active: null, new: null, cancelled: null },
    ]);
    expect(MEMBERSHIP_SERIES.map((s) => s.key)).toEqual(["new", "cancelled"]);
    expect(giftCardSeries([full, none])).toEqual([
      { month: "2026-01", sold: 70, redeemed: 30 },
      { month: "2026-02", sold: null, redeemed: null },
    ]);
    expect(GIFT_CARD_SERIES.map((s) => s.key)).toEqual(["sold", "redeemed"]);
  });

  it("rebooking rate is null with zero appointments", () => {
    const z = { ...full, rebooking: { rebooked: 0, notRebooked: 0, totalAppointments: 0 } };
    expect(rebookingRateSeries([z])[0]?.rate).toBeNull();
  });
});

describe("team", () => {
  const providers = [
    provider({ provider: "Low", serviceSales: 100, hoursBooked: 5, hoursAvailable: 10, appointments: 4, rebooked: 1 }),
    provider({ provider: "High", role: "Massage Therapist", serviceSales: 900, retailSales: 40, hoursBooked: 1, hoursAvailable: 0, appointments: 0, rebooked: 0 }),
    provider({ provider: "Studio", role: "Self-guided", serviceSales: 5000 }),
    provider({ provider: "Desk", role: "Front Desk", serviceSales: 0 }),
  ];
  const jan: MonthReport = { ...empty("2026-01"), providers };
  const feb: MonthReport = {
    ...empty("2026-02"),
    providers: [provider({ provider: "Low", serviceSales: 500, hoursBooked: 9, hoursAvailable: 10 }), provider({ provider: "New", serviceSales: 1, role: "Tarot Reader" })],
  };

  it("teamPerformance excludes non-staff, sorts by service sales and guards divisions", () => {
    const team = teamPerformance(jan);
    expect(team.map((t) => t.name)).toEqual(["High", "Low"]);
    expect(team[0]).toEqual({ name: "High", role: "Massage Therapist", serviceSales: 900, retailSales: 40, utilization: null, rebookRate: null });
    expect(team[1]).toMatchObject({ utilization: 0.5, rebookRate: 0.25 });
    expect(teamPerformance(empty("x"))).toEqual([]);
  });

  it("teamPerformance breaks sales ties by name", () => {
    const tie: MonthReport = { ...empty("t"), providers: [provider({ provider: "B" }), provider({ provider: "A" })] };
    expect(teamPerformance(tie).map((t) => t.name)).toEqual(["A", "B"]);
  });

  it("utilizationPanels: one per staffed provider, ordered by total service sales, null when absent", () => {
    const panels = utilizationPanels([jan, feb, empty("2026-03")]);
    expect(panels.map((p) => p.title)).toEqual(["High", "Low", "New"]);
    expect(panels[1]?.role).toBe("Esthetician");
    expect(panels[1]?.data).toEqual([
      { month: "2026-01", value: 0.5 },
      { month: "2026-02", value: 0.9 },
      { month: "2026-03", value: null },
    ]);
    expect(panels[0]?.data.map((d) => d.value)).toEqual([null, null, null]);
    expect(panels[2]?.data[1]?.value).toBe(0.8);
    expect(new Set(panels.map((p) => p.id)).size).toBe(3);
  });

  it("utilizationPanels orders ties by name", () => {
    const tie: MonthReport = { ...empty("t"), providers: [provider({ provider: "B" }), provider({ provider: "A" })] };
    expect(utilizationPanels([tie]).map((p) => p.title)).toEqual(["A", "B"]);
  });
});

describe("topServices", () => {
  const report: MonthReport = {
    ...empty("2026-01"),
    items: [
      item({ item: "Small", net: 10, units: 1 }),
      item({ item: "Big", net: 500, units: 5, category: "Massage" }),
      item({ item: "Candle", net: 9999, group: "Retail" }),
      item({ item: "Mid B", net: 100 }),
      item({ item: "Mid A", net: 100 }),
    ],
  };
  it("lists service items by net with tiebreak, limited to n", () => {
    expect(topServices(report).map((s) => s.name)).toEqual(["Big", "Mid A", "Mid B", "Small"]);
    expect(topServices(report, 2)).toEqual([
      { name: "Big", net: 500, units: 5, category: "Massage" },
      { name: "Mid A", net: 100, units: 1, category: "Facials" },
    ]);
    expect(topServices(empty("x"))).toEqual([]);
  });
});
