/**
 * Pure parsing helpers for the CSV/JSON report files. No `server-only` and no
 * `fs`, so they are trivially testable. Every per-file parser takes the file's
 * text and returns the typed value, or `null` (with a `console.warn`) when the
 * file is unusable. `source` is only used in warnings, e.g. `"2026-09/clients.json"`.
 */
import Papa from "papaparse";
import type {
  CategorySale,
  ClientCounts,
  ItemSale,
  Memberships,
  ProviderSale,
  Rebooking,
  SalesGroup,
  SalesSummary,
} from "./reports-types";

function warn(source: string, message: string): void {
  console.warn(`[Reports] ${source}: ${message}`);
}

/**
 * Money/number parsing. Accepts `1424`, `"1,424.00"`, `"$1,424.00"`, `"-$12"`,
 * `"(12.00)"` (accounting negative). Blank/null/undefined → `0` (per the data
 * contract). Anything non-numeric (`"abc"`, `NaN`, objects) → `NaN`, so callers
 * can tell "bad" from "zero" with `Number.isFinite`.
 */
export function parseMoney(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  if (typeof value !== "string") return Number.NaN;
  let s = value.trim();
  if (s === "") return 0;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1).trim();
  }
  s = s.replace(/^\$/, "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return Number.NaN;
  const n = Number(s);
  return negative ? -n : n;
}

export interface ParsedCsv {
  fields: string[];
  rows: Record<string, string>[];
}

function parseCsvFull(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return { fields: result.meta.fields ?? [], rows: result.data };
}

/** Parses CSV text into header-keyed rows (headers trimmed, blank lines skipped). */
export function parseCsv(text: string): Record<string, string>[] {
  return parseCsvFull(text).rows;
}

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

/** Parses the CSV and checks the required columns exist; otherwise warns and returns null. */
function readTable(text: string, required: string[], source: string): Record<string, string>[] | null {
  const { fields, rows } = parseCsvFull(text);
  const missing = required.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    warn(source, `missing column(s): ${missing.join(", ")}`);
    return null;
  }
  return rows;
}

function parseGroup(value: string): SalesGroup | null {
  const v = value.trim().toLowerCase();
  if (v === "service") return "Service";
  if (v === "retail") return "Retail";
  return null;
}

// ── sales_summary.csv ───────────────────────────────────────────────────────

const SUMMARY_LABELS: Record<string, keyof SalesSummary> = {
  "service sales": "serviceSales",
  "retail sales": "retailSales",
  "membership revenue": "membershipRevenue",
  "gift card sales": "giftCardSales",
  "discounts & comps": "discounts",
  refunds: "refunds",
  "gift card redemptions": "giftCardRedemptions",
  "processing fees": "processingFees",
  "net sales": "netSales",
};

export function parseSalesSummary(text: string, source = "sales_summary.csv"): SalesSummary | null {
  const rows = readTable(text, ["Label", "Amount"], source);
  if (!rows) return null;
  const summary: SalesSummary = {
    serviceSales: null,
    retailSales: null,
    membershipRevenue: null,
    giftCardSales: null,
    discounts: null,
    refunds: null,
    giftCardRedemptions: null,
    processingFees: null,
    netSales: null,
  };
  for (const row of rows) {
    const key = SUMMARY_LABELS[cell(row, "Label").toLowerCase()];
    if (!key) continue;
    const amount = parseMoney(row["Amount"]);
    if (Number.isFinite(amount)) summary[key] = amount;
    else warn(source, `bad amount for "${cell(row, "Label")}"`);
  }
  return summary;
}

// ── category_sales.csv ──────────────────────────────────────────────────────

export function parseCategorySales(text: string, source = "category_sales.csv"): CategorySale[] | null {
  const rows = readTable(text, ["Category", "Group", "Units Sold", "Sub-Total", "Discount"], source);
  if (!rows) return null;
  const out: CategorySale[] = [];
  for (const row of rows) {
    const category = cell(row, "Category");
    const group = parseGroup(cell(row, "Group"));
    if (!group) {
      warn(source, `unknown group "${cell(row, "Group")}" for "${category}", row skipped`);
      continue;
    }
    const units = parseMoney(row["Units Sold"]);
    const subTotal = parseMoney(row["Sub-Total"]);
    const discount = parseMoney(row["Discount"]);
    if (!category || ![units, subTotal, discount].every(Number.isFinite)) {
      warn(source, `bad row for "${category}", row skipped`);
      continue;
    }
    out.push({ category, group, units, subTotal, discount });
  }
  return out;
}

// ── item_sales.csv ──────────────────────────────────────────────────────────

export function parseItemSales(text: string, source = "item_sales.csv"): ItemSale[] | null {
  const rows = readTable(text, ["Item", "Category", "Group", "Add-on", "Units Sold", "Sub-Total", "Discount", "Net"], source);
  if (!rows) return null;
  const merged = new Map<string, ItemSale>();
  for (const row of rows) {
    const item = cell(row, "Item");
    const group = parseGroup(cell(row, "Group"));
    if (!group) {
      warn(source, `unknown group "${cell(row, "Group")}" for "${item}", row skipped`);
      continue;
    }
    const units = parseMoney(row["Units Sold"]);
    const subTotal = parseMoney(row["Sub-Total"]);
    const discount = parseMoney(row["Discount"]);
    const net = parseMoney(row["Net"]);
    if (!item || ![units, subTotal, discount, net].every(Number.isFinite)) {
      warn(source, `bad row for "${item}", row skipped`);
      continue;
    }
    const isAddOn = cell(row, "Add-on").toLowerCase() === "yes";
    const key = `${item.toLowerCase()}|${group}`;
    const existing = merged.get(key);
    if (existing) {
      existing.units += units;
      existing.subTotal += subTotal;
      existing.discount += discount;
      existing.net += net;
      existing.isAddOn = existing.isAddOn || isAddOn;
    } else {
      merged.set(key, { item, category: cell(row, "Category"), group, isAddOn, units, subTotal, discount, net });
    }
  }
  return [...merged.values()];
}

// ── provider_sales.csv ──────────────────────────────────────────────────────

export function parseProviderSales(text: string, source = "provider_sales.csv"): ProviderSale[] | null {
  const rows = readTable(
    text,
    ["Provider", "Role", "Appointments", "Hours Booked", "Hours Available", "Service Sales", "Retail Sales", "Rebooked"],
    source,
  );
  if (!rows) return null;
  const out: ProviderSale[] = [];
  for (const row of rows) {
    const provider = cell(row, "Provider");
    const appointments = parseMoney(row["Appointments"]);
    const hoursBooked = parseMoney(row["Hours Booked"]);
    const hoursAvailable = parseMoney(row["Hours Available"]);
    const serviceSales = parseMoney(row["Service Sales"]);
    const retailSales = parseMoney(row["Retail Sales"]);
    const rebooked = parseMoney(row["Rebooked"]);
    if (!provider || ![appointments, hoursBooked, hoursAvailable, serviceSales, retailSales, rebooked].every(Number.isFinite)) {
      warn(source, `bad row for "${provider}", row skipped`);
      continue;
    }
    out.push({ provider, role: cell(row, "Role"), appointments, hoursBooked, hoursAvailable, serviceSales, retailSales, rebooked });
  }
  return out;
}

// ── JSON files ──────────────────────────────────────────────────────────────

/** Parses JSON and reads the given snake_case numeric fields; null + warn on any problem. */
function readJsonNumbers<K extends string>(text: string, fields: readonly string[], source: string): Record<K, number> | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    warn(source, "invalid JSON");
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    warn(source, "expected a JSON object");
    return null;
  }
  const record = data as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const field of fields) {
    const v = record[field];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      warn(source, `field "${field}" is missing or not a finite number`);
      return null;
    }
    out[field] = v;
  }
  return out as Record<K, number>;
}

export function parseClients(text: string, source = "clients.json"): ClientCounts | null {
  const d = readJsonNumbers<"new_clients" | "returning_clients" | "total_clients">(
    text,
    ["new_clients", "returning_clients", "total_clients"],
    source,
  );
  return d && { newClients: d.new_clients, returningClients: d.returning_clients, totalClients: d.total_clients };
}

export function parseRebooking(text: string, source = "rebooking.json"): Rebooking | null {
  const d = readJsonNumbers<"rebooked" | "not_rebooked" | "total_appointments">(
    text,
    ["rebooked", "not_rebooked", "total_appointments"],
    source,
  );
  return d && { rebooked: d.rebooked, notRebooked: d.not_rebooked, totalAppointments: d.total_appointments };
}

export function parseMemberships(text: string, source = "memberships.json"): Memberships | null {
  const d = readJsonNumbers<"active_start" | "new_members" | "cancelled" | "active_end" | "membership_revenue">(
    text,
    ["active_start", "new_members", "cancelled", "active_end", "membership_revenue"],
    source,
  );
  return (
    d && {
      activeStart: d.active_start,
      newMembers: d.new_members,
      cancelled: d.cancelled,
      activeEnd: d.active_end,
      membershipRevenue: d.membership_revenue,
    }
  );
}
