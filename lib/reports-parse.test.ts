// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  parseCategorySales,
  parseClients,
  parseCsv,
  parseItemSales,
  parseMemberships,
  parseMoney,
  parseProviderSales,
  parseRebooking,
  parseSalesSummary,
} from "./reports-parse";

let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("parseMoney", () => {
  it.each([
    ["1,424.00", 1424],
    ["$1,424.00", 1424],
    [1424, 1424],
    ["", 0],
    ["   ", 0],
    [null, 0],
    [undefined, 0],
    ["(12.00)", -12],
    ["-12.5", -12.5],
    ["-$1,000", -1000],
    [".5", 0.5],
    ["0", 0],
  ])("parses %j as %j", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["abc", "1.2.3", "12%", "$(5)", {}, [], true])("returns NaN for non-numeric %j", (input) => {
    expect(parseMoney(input)).toBeNaN();
  });
});

describe("parseCsv", () => {
  it("handles quoted commas, trims headers and skips blank lines", () => {
    const rows = parseCsv(' Category , Units \n"Sauna, Soak + Steam",74\n\nFacials,206\n');
    expect(rows).toEqual([
      { Category: "Sauna, Soak + Steam", Units: "74" },
      { Category: "Facials", Units: "206" },
    ]);
  });

  it("returns [] for empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseSalesSummary", () => {
  it("matches labels trimmed and case-insensitively; missing rows are null", () => {
    const s = parseSalesSummary("Label,Amount\n Service Sales ,\"106,397.00\"\nnet sales,$128307.60\nUnknown,5\n");
    expect(s?.serviceSales).toBe(106397);
    expect(s?.netSales).toBe(128307.6);
    expect(s?.retailSales).toBeNull();
    expect(s?.discounts).toBeNull();
  });

  it("nulls a bad amount and warns; returns null for the wrong columns", () => {
    expect(parseSalesSummary("Label,Amount\nRefunds,abc\n", "2026-09/sales_summary.csv")?.refunds).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Reports] 2026-09/sales_summary.csv"));
    expect(parseSalesSummary("nope\n1\n")).toBeNull();
    expect(parseSalesSummary("")).toBeNull();
  });
});

describe("parseCategorySales", () => {
  const header = "Category,Group,Units Sold,Sub-Total,Discount\n";

  it("parses rows with quoted commas", () => {
    expect(parseCategorySales(`${header}"Sauna, Soak + Steam",Service,74,"15,151.00",837.11\nSkincare,retail,105,4966,\n`)).toEqual([
      { category: "Sauna, Soak + Steam", group: "Service", units: 74, subTotal: 15151, discount: 837.11 },
      { category: "Skincare", group: "Retail", units: 105, subTotal: 4966, discount: 0 },
    ]);
  });

  it("warns and skips unknown groups and bad numbers", () => {
    const rows = parseCategorySales(`${header}Mystery,Other,1,1,0\nBad,Service,x,1,0\nOk,Service,1,2,3\n`, "2026-09/category_sales.csv");
    expect(rows).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain("[Reports] 2026-09/category_sales.csv");
  });

  it("returns null when columns are missing, [] for header-only", () => {
    expect(parseCategorySales("Category,Group\nA,Service\n")).toBeNull();
    expect(parseCategorySales(header)).toEqual([]);
  });
});

describe("parseItemSales", () => {
  const header = "Item,Category,Group,Add-on,Units Sold,Sub-Total,Discount,Net\n";

  it("trims names, merges duplicates case-insensitively and maps Add-on", () => {
    const items = parseItemSales(
      `${header}Brow Tint,Lashes + Brows,Service,Yes,2,50,5,45\n  brow tint ,Lashes + Brows,Service,Yes,3,75,0,75\nCandle,Home,Retail,No,1,10,0,10\nWeird,X,Nope,No,1,1,0,1\nNoNet,X,Service,No,1,1,0,zzz\n`,
    );
    expect(items).toEqual([
      { item: "Brow Tint", category: "Lashes + Brows", group: "Service", isAddOn: true, units: 5, subTotal: 125, discount: 5, net: 120 },
      { item: "Candle", category: "Home", group: "Retail", isAddOn: false, units: 1, subTotal: 10, discount: 0, net: 10 },
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("returns null for the wrong shape", () => {
    expect(parseItemSales("a,b\n1,2\n")).toBeNull();
  });
});

describe("parseProviderSales", () => {
  const header = "Provider,Role,Appointments,Hours Booked,Hours Available,Service Sales,Retail Sales,Rebooked\n";

  it("parses rows and skips bad ones", () => {
    const rows = parseProviderSales(`${header}Ava,Esthetician,123,106,147,16110.00,350.26,59\nBad,Esthetician,x,1,1,1,1,1\n,Role,1,1,1,1,1,1\n`);
    expect(rows).toEqual([
      { provider: "Ava", role: "Esthetician", appointments: 123, hoursBooked: 106, hoursAvailable: 147, serviceSales: 16110, retailSales: 350.26, rebooked: 59 },
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("returns null for the wrong shape", () => {
    expect(parseProviderSales("Provider\nA\n")).toBeNull();
  });
});

describe("JSON files", () => {
  it("parses clients, rebooking and memberships", () => {
    expect(parseClients('{"new_clients":97,"returning_clients":500,"total_clients":597}')).toEqual({
      newClients: 97,
      returningClients: 500,
      totalClients: 597,
    });
    expect(parseRebooking('{"rebooked":379,"not_rebooked":422,"total_appointments":801}')).toEqual({
      rebooked: 379,
      notRebooked: 422,
      totalAppointments: 801,
    });
    expect(
      parseMemberships('{"active_start":232,"new_members":12,"cancelled":9,"active_end":235,"membership_revenue":23265}'),
    ).toEqual({ activeStart: 232, newMembers: 12, cancelled: 9, activeEnd: 235, membershipRevenue: 23265 });
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["an array", "[1,2]"],
    ["null", "null"],
    ["a missing field", '{"new_clients":1,"returning_clients":2}'],
    ["a string number", '{"new_clients":"1","returning_clients":2,"total_clients":3}'],
    ["null field", '{"new_clients":null,"returning_clients":2,"total_clients":3}'],
  ])("returns null and warns for %s", (_label, text) => {
    expect(parseClients(text, "2026-09/clients.json")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Reports] 2026-09/clients.json"));
  });

  it("rejects non-finite numbers in memberships and rebooking", () => {
    expect(parseMemberships('{"active_start":1e999,"new_members":1,"cancelled":1,"active_end":1,"membership_revenue":1}')).toBeNull();
    expect(parseRebooking("{}")).toBeNull();
  });
});
