/**
 * Pure, fs-free series builders: `MonthReport[]` in, chart-ready rows out.
 * Conventions: rates and shares are fractions (0-1); a gap is `null`, never 0.
 * A file that exists but has no row for a category/provider counts as 0 for
 * that category (nothing sold), while a missing file is a gap.
 */
import { CATEGORICAL, OTHER_COLOR, OTHER_LABEL, categoricalColor } from "./chart-theme";
import type {
  CategorySale,
  ItemSale,
  MonthKey,
  MonthReport,
  ProviderSale,
  SalesGroup,
} from "./reports-types";

export type MonthRow = { month: MonthKey } & Record<string, number | null>;
export type Series = { key: string; name: string; color: string };

const NON_STAFF_ROLES = new Set(["self-guided", "front desk"]);

function row(month: MonthKey, values: Record<string, number | null>): MonthRow {
  return { month, ...values } as MonthRow;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** False for the self-guided studio and the front desk (kept in totals, not in staff charts). */
export function isStaffProvider(provider: Pick<ProviderSale, "role">): boolean {
  return !NON_STAFF_ROLES.has(provider.role.trim().toLowerCase());
}

function staff(report: MonthReport): ProviderSale[] | null {
  return report.providers ? report.providers.filter(isStaffProvider) : null;
}

// ── Per-month metrics (shared by KPIs and series) ───────────────────────────

const netSales = (r: MonthReport) => r.sales?.netSales ?? null;
const serviceSales = (r: MonthReport) => r.sales?.serviceSales ?? null;
const retailSales = (r: MonthReport) => r.sales?.retailSales ?? null;
const totalClients = (r: MonthReport) => r.clients?.totalClients ?? null;
const rebookingRate = (r: MonthReport) => (r.rebooking ? ratio(r.rebooking.rebooked, r.rebooking.totalAppointments) : null);
const activeMembers = (r: MonthReport) => r.memberships?.activeEnd ?? null;
const avgSpend = (r: MonthReport) => ratio(netSales(r), totalClients(r));

function utilization(r: MonthReport): number | null {
  const people = staff(r);
  if (!people) return null;
  return ratio(sum(people.map((p) => p.hoursBooked)), sum(people.map((p) => p.hoursAvailable)));
}

// ── A. KPI tiles ────────────────────────────────────────────────────────────

export interface Kpi {
  value: number | null;
  /** The month immediately before in the array; null for the first month. */
  previous: number | null;
  changeKind: "relative" | "points";
}

export interface Kpis {
  netSales: Kpi;
  serviceSales: Kpi;
  retailSales: Kpi;
  clients: Kpi;
  /** Fractions; change in points. */
  rebookingRate: Kpi;
  activeMembers: Kpi;
  avgSpend: Kpi;
  /** Fractions; change in points. */
  utilization: Kpi;
  hints: {
    retailPerClient: number | null;
    newClients: number | null;
    newMembers: number | null;
    cancelled: number | null;
  };
}

export function buildKpis(reports: MonthReport[], month: MonthKey): Kpis {
  const index = reports.findIndex((r) => r.month === month);
  const current = reports[index];
  const prior = index > 0 ? reports[index - 1] : undefined;
  const kpi = (fn: (r: MonthReport) => number | null, changeKind: Kpi["changeKind"] = "relative"): Kpi => ({
    value: current ? fn(current) : null,
    previous: prior ? fn(prior) : null,
    changeKind,
  });
  return {
    netSales: kpi(netSales),
    serviceSales: kpi(serviceSales),
    retailSales: kpi(retailSales),
    clients: kpi(totalClients),
    rebookingRate: kpi(rebookingRate, "points"),
    activeMembers: kpi(activeMembers),
    avgSpend: kpi(avgSpend),
    utilization: kpi(utilization, "points"),
    hints: {
      retailPerClient: current ? ratio(retailSales(current), totalClients(current)) : null,
      newClients: current?.clients?.newClients ?? null,
      newMembers: current?.memberships?.newMembers ?? null,
      cancelled: current?.memberships?.cancelled ?? null,
    },
  };
}

// ── B. Revenue ──────────────────────────────────────────────────────────────

/** Rows `{ month, net }`. */
export function netSalesSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => row(r.month, { net: netSales(r) }));
}

/** Stack order, bottom to top. */
export const REVENUE_MIX_SERIES: Series[] = [
  { key: "services", name: "Services", color: CATEGORICAL[0] },
  { key: "retail", name: "Retail", color: CATEGORICAL[1] },
  { key: "memberships", name: "Memberships", color: CATEGORICAL[2] },
  { key: "giftCards", name: "Gift card sales", color: CATEGORICAL[3] },
];

/** Rows `{ month, services, retail, memberships, giftCards }`, each null when its row is missing. */
export function revenueMixSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) =>
    row(r.month, {
      services: serviceSales(r),
      retail: retailSales(r),
      memberships: r.sales?.membershipRevenue ?? null,
      giftCards: r.sales?.giftCardSales ?? null,
    }),
  );
}

/** Rows `{ month, rate }`: discounts / (service + retail sales). */
export function discountRateSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => {
    const s = r.sales;
    const base = s && s.serviceSales != null && s.retailSales != null ? s.serviceSales + s.retailSales : null;
    return row(r.month, { rate: ratio(s?.discounts ?? null, base) });
  });
}

// ── C. Categories ───────────────────────────────────────────────────────────

function groupRows(report: MonthReport, group: SalesGroup): CategorySale[] | null {
  return report.categories ? report.categories.filter((c) => c.group === group) : null;
}

/** All categories of `group`, ranked by total Sub-Total across every month (ties by name). */
function rankAll(reports: MonthReport[], group: SalesGroup): string[] {
  const totals = new Map<string, number>();
  for (const r of reports) {
    for (const c of groupRows(r, group) ?? []) totals.set(c.category, (totals.get(c.category) ?? 0) + c.subTotal);
  }
  return [...totals.entries()]
    .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
    .map(([name]) => name);
}

/** Top `n` category names of `group`, ranked once across all months. Rank decides the color. */
export function rankCategories(reports: MonthReport[], group: SalesGroup, n = 6): string[] {
  return rankAll(reports, group).slice(0, n);
}

const categoryKey = (rank: number) => `c${rank}`;
const OTHER_KEY = "other";

function hasOther(reports: MonthReport[], group: SalesGroup, ranked: string[]): boolean {
  return reports.some((r) => (groupRows(r, group) ?? []).some((c) => !ranked.includes(c.category)));
}

/**
 * Series for the ranked categories (keys `c0`, `c1`, ... by rank, bottom to top),
 * plus an "Other" series (key `other`) only when some month has unranked categories.
 */
export function categorySeries(reports: MonthReport[], group: SalesGroup, ranked: string[]): Series[] {
  const series: Series[] = ranked.map((name, i) => ({ key: categoryKey(i), name, color: categoricalColor(i) }));
  if (hasOther(reports, group, ranked)) series.push({ key: OTHER_KEY, name: OTHER_LABEL, color: OTHER_COLOR });
  return series;
}

export interface MixSlice {
  key: string;
  name: string;
  value: number;
  /** Fraction of the group total. */
  share: number;
  color: string;
}

/** Donut data for one month: ranked categories present that month (rank order) + "Other". `total` is null without data. */
export function categoryMixForMonth(
  report: MonthReport,
  group: SalesGroup,
  ranked: string[],
): { slices: MixSlice[]; total: number | null } {
  const rows = groupRows(report, group);
  if (!rows) return { slices: [], total: null };
  const total = sum(rows.map((c) => c.subTotal));
  const slices: MixSlice[] = [];
  ranked.forEach((name, i) => {
    const found = rows.filter((c) => c.category === name);
    if (found.length === 0) return;
    const value = sum(found.map((c) => c.subTotal));
    slices.push({ key: categoryKey(i), name, value, share: total === 0 ? 0 : value / total, color: categoricalColor(i) });
  });
  const other = sum(rows.filter((c) => !ranked.includes(c.category)).map((c) => c.subTotal));
  if (rows.some((c) => !ranked.includes(c.category))) {
    slices.push({ key: OTHER_KEY, name: OTHER_LABEL, value: other, share: total === 0 ? 0 : other / total, color: OTHER_COLOR });
  }
  return { slices, total };
}

/** Stacked rows `{ month, c0.., other? }` of Sub-Total; every key is null when the month has no category file. */
export function categorySalesSeries(reports: MonthReport[], group: SalesGroup, ranked: string[]): MonthRow[] {
  const showOther = hasOther(reports, group, ranked);
  return reports.map((r) => {
    const rows = groupRows(r, group);
    const values: Record<string, number | null> = {};
    ranked.forEach((name, i) => {
      values[categoryKey(i)] = rows ? sum(rows.filter((c) => c.category === name).map((c) => c.subTotal)) : null;
    });
    if (showOther) {
      values[OTHER_KEY] = rows ? sum(rows.filter((c) => !ranked.includes(c.category)).map((c) => c.subTotal)) : null;
    }
    return row(r.month, values);
  });
}

export interface CategoryPanel {
  id: string;
  title: string;
  color: string;
  /** `value` is units for Service and Sub-Total dollars for Retail; `units` is always units. */
  data: { month: MonthKey; value: number | null; units: number | null }[];
}

/** One panel per category of `group` (all of them, ordered by rank) for small multiples. */
export function categoryUnitsPanels(reports: MonthReport[], group: SalesGroup): CategoryPanel[] {
  return rankAll(reports, group).map((name, i) => ({
    id: `${group.toLowerCase()}-${i}`,
    title: name,
    color: categoricalColor(i),
    data: reports.map((r) => {
      const rows = groupRows(r, group);
      if (!rows) return { month: r.month, value: null, units: null };
      const found = rows.filter((c) => c.category === name);
      const units = sum(found.map((c) => c.units));
      return { month: r.month, value: group === "Retail" ? sum(found.map((c) => c.subTotal)) : units, units };
    }),
  }));
}

function addOnUnits(items: ItemSale[]): number {
  return sum(items.filter((i) => i.isAddOn && i.group === "Service").map((i) => i.units));
}

function appointmentCount(r: MonthReport): number | null {
  if (r.rebooking) return r.rebooking.totalAppointments;
  if (r.providers) return sum(r.providers.map((p) => p.appointments));
  return null;
}

/** Rows `{ month, rate }`: add-on units / appointments (rebooking total, else provider sum). */
export function addOnAttachRateSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => row(r.month, { rate: r.items ? ratio(addOnUnits(r.items), appointmentCount(r)) : null }));
}

// ── D. Studio ───────────────────────────────────────────────────────────────

/**
 * Rows `{ month, guests }`: units of the Service category matching /sauna/i.
 * When item sales exist, add-on items (the "Extra Hour in the Studio") are
 * excluded so guests are people, not extra hours; otherwise the category units.
 */
export function studioGuestsSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => {
    const category = r.categories?.find((c) => c.group === "Service" && /sauna/i.test(c.category));
    if (!r.categories) return row(r.month, { guests: null });
    if (!category) return row(r.month, { guests: 0 });
    if (!r.items) return row(r.month, { guests: category.units });
    const units = sum(r.items.filter((i) => i.category === category.category && !i.isAddOn).map((i) => i.units));
    return row(r.month, { guests: units });
  });
}

// ── F. Clients & loyalty ────────────────────────────────────────────────────

/** Returning first (bottom of the stack). */
export const CLIENT_SERIES: Series[] = [
  { key: "returning", name: "Returning", color: CATEGORICAL[0] },
  { key: "new", name: "New", color: CATEGORICAL[1] },
];

/** Rows `{ month, returning, new }`. */
export function clientsSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) =>
    row(r.month, { returning: r.clients?.returningClients ?? null, new: r.clients?.newClients ?? null }),
  );
}

/** Rows `{ month, rate }` (fraction). */
export function rebookingRateSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => row(r.month, { rate: rebookingRate(r) }));
}

export const MEMBERSHIP_SERIES: Series[] = [
  { key: "new", name: "New members", color: CATEGORICAL[0] },
  { key: "cancelled", name: "Cancelled", color: CATEGORICAL[3] },
];

/** Rows `{ month, active, new, cancelled }`; `active` is the end-of-month count. */
export function membershipSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) =>
    row(r.month, {
      active: r.memberships?.activeEnd ?? null,
      new: r.memberships?.newMembers ?? null,
      cancelled: r.memberships?.cancelled ?? null,
    }),
  );
}

export const GIFT_CARD_SERIES: Series[] = [
  { key: "sold", name: "Sold", color: CATEGORICAL[0] },
  { key: "redeemed", name: "Redeemed", color: CATEGORICAL[1] },
];

/** Rows `{ month, sold, redeemed }` in dollars. */
export function giftCardSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) =>
    row(r.month, { sold: r.sales?.giftCardSales ?? null, redeemed: r.sales?.giftCardRedemptions ?? null }),
  );
}

// ── G. Team ─────────────────────────────────────────────────────────────────

export interface TeamMember {
  name: string;
  role: string;
  serviceSales: number;
  retailSales: number;
  /** Hours booked / available; null when no hours are available. */
  utilization: number | null;
  /** Rebooked / appointments; null when there are no appointments. */
  rebookRate: number | null;
}

/** Staffed providers for one month, by service sales descending. */
export function teamPerformance(report: MonthReport): TeamMember[] {
  return (staff(report) ?? [])
    .map((p) => ({
      name: p.provider,
      role: p.role,
      serviceSales: p.serviceSales,
      retailSales: p.retailSales,
      utilization: ratio(p.hoursBooked, p.hoursAvailable),
      rebookRate: ratio(p.rebooked, p.appointments),
    }))
    .sort((a, b) => b.serviceSales - a.serviceSales || a.name.localeCompare(b.name));
}

export interface UtilizationPanel {
  id: string;
  title: string;
  role: string;
  data: { month: MonthKey; value: number | null }[];
}

/** One panel per staffed provider, ordered by total service sales across all months. */
export function utilizationPanels(reports: MonthReport[]): UtilizationPanel[] {
  const totals = new Map<string, { role: string; sales: number }>();
  for (const r of reports) {
    for (const p of staff(r) ?? []) {
      const entry = totals.get(p.provider) ?? { role: p.role, sales: 0 };
      entry.sales += p.serviceSales;
      entry.role = p.role;
      totals.set(p.provider, entry);
    }
  }
  return [...totals.entries()]
    .sort(([nameA, a], [nameB, b]) => b.sales - a.sales || nameA.localeCompare(nameB))
    .map(([name, { role }], i) => ({
      id: `provider-${i}`,
      title: name,
      role,
      data: reports.map((r) => {
        const p = staff(r)?.find((x) => x.provider === name);
        return { month: r.month, value: p ? ratio(p.hoursBooked, p.hoursAvailable) : null };
      }),
    }));
}

// ── H. Insights ─────────────────────────────────────────────────────────────

export interface TopService {
  name: string;
  net: number;
  units: number;
  category: string;
}

/** Service items (add-ons included) by net descending. */
export function topServices(report: MonthReport, n = 10): TopService[] {
  return (report.items ?? [])
    .filter((i) => i.group === "Service")
    .map((i) => ({ name: i.item, net: i.net, units: i.units, category: i.category }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name))
    .slice(0, n);
}

/** Rows `{ month, value }`: net sales / total clients. */
export function avgSpendSeries(reports: MonthReport[]): MonthRow[] {
  return reports.map((r) => row(r.month, { value: avgSpend(r) }));
}
