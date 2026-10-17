/**
 * The report data contract. A POS adapter (see `reports-source.ts`) turns one
 * month's export folder into a `MonthReport`; everything downstream only sees
 * these types. No `server-only` here so client components can import them.
 *
 * Gaps are `null`, never `0`: a missing file (or an unreadable one) means
 * "we don't know", which charts must render as a gap.
 */

/** `"YYYY-MM"`. Format with the helpers in `format.ts`, never `new Date()`. */
export type MonthKey = string;

export type SalesGroup = "Service" | "Retail";

/** `sales_summary.csv`. Each field is `null` when its row is missing. */
export interface SalesSummary {
  serviceSales: number | null;
  retailSales: number | null;
  membershipRevenue: number | null;
  giftCardSales: number | null;
  discounts: number | null;
  refunds: number | null;
  giftCardRedemptions: number | null;
  processingFees: number | null;
  netSales: number | null;
}

/** One row of `category_sales.csv`. `subTotal` is before discounts. */
export interface CategorySale {
  category: string;
  group: SalesGroup;
  units: number;
  subTotal: number;
  discount: number;
}

/** One row of `item_sales.csv` (names trimmed, duplicates merged case-insensitively). */
export interface ItemSale {
  item: string;
  category: string;
  group: SalesGroup;
  /** Upsell that rides along with an appointment (`Add-on = Yes`). */
  isAddOn: boolean;
  units: number;
  subTotal: number;
  discount: number;
  net: number;
}

/**
 * One row of `provider_sales.csv`. Rows with role `Self-guided` (the studio)
 * or `Front Desk` (retail only) are not people: keep them in totals, but leave
 * them out of staff-performance charts.
 */
export interface ProviderSale {
  provider: string;
  role: string;
  appointments: number;
  hoursBooked: number;
  hoursAvailable: number;
  serviceSales: number;
  retailSales: number;
  rebooked: number;
}

/** `clients.json` */
export interface ClientCounts {
  newClients: number;
  returningClients: number;
  totalClients: number;
}

/** `rebooking.json` */
export interface Rebooking {
  rebooked: number;
  notRebooked: number;
  totalAppointments: number;
}

/** `memberships.json` */
export interface Memberships {
  activeStart: number;
  newMembers: number;
  cancelled: number;
  activeEnd: number;
  membershipRevenue: number;
}

export interface MonthReport {
  month: MonthKey;
  sales: SalesSummary | null;
  categories: CategorySale[] | null;
  items: ItemSale[] | null;
  providers: ProviderSale[] | null;
  clients: ClientCounts | null;
  rebooking: Rebooking | null;
  memberships: Memberships | null;
}

/**
 * Reads one month's folder into a `MonthReport`. The demo uses a CSV/JSON
 * adapter; a real client's POS export (Boulevard, Vagaro, Mindbody, …) gets its
 * own adapter and the charts don't change.
 */
export interface ReportAdapter {
  loadMonth(dir: string): MonthReport;
}
