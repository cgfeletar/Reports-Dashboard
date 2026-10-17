import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  parseCategorySales,
  parseClients,
  parseItemSales,
  parseMemberships,
  parseProviderSales,
  parseRebooking,
  parseSalesSummary,
} from "./reports-parse";
import type { MonthReport, ReportAdapter } from "./reports-types";

const MONTH_DIR = /^\d{4}-\d{2}$/;

/** Reads `file` in `dir` and runs `parse`; missing → null (silently), unreadable or garbage → null + warn. */
function readFile<T>(dir: string, file: string, parse: (text: string, source: string) => T | null): T | null {
  const full = path.join(dir, file);
  const source = `${path.basename(dir)}/${file}`;
  if (!fs.existsSync(full)) return null;
  let text: string;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch (error) {
    console.warn(`[Reports] ${source}: unreadable (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
  return parse(text, source);
}

/** The demo adapter: one folder of CSV/JSON files per month. */
export const csvJsonAdapter: ReportAdapter = {
  loadMonth(dir: string): MonthReport {
    return {
      month: path.basename(dir),
      sales: readFile(dir, "sales_summary.csv", parseSalesSummary),
      categories: readFile(dir, "category_sales.csv", parseCategorySales),
      items: readFile(dir, "item_sales.csv", parseItemSales),
      providers: readFile(dir, "provider_sales.csv", parseProviderSales),
      clients: readFile(dir, "clients.json", parseClients),
      rebooking: readFile(dir, "rebooking.json", parseRebooking),
      memberships: readFile(dir, "memberships.json", parseMemberships),
    };
  },
};

export interface LoadReportsOptions {
  /** Defaults to `process.env.REPORTS_DIR ?? "reports"`, resolved against `process.cwd()`. */
  root?: string;
  adapter?: ReportAdapter;
}

/** Loads every `YYYY-MM` folder under the reports root, oldest → newest. */
export function loadReports(options: LoadReportsOptions = {}): MonthReport[] {
  const adapter = options.adapter ?? csvJsonAdapter;
  const root = path.resolve(process.cwd(), options.root ?? process.env.REPORTS_DIR ?? "reports");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    console.warn(`[Reports] reports folder not found: ${root}`);
    return [];
  }
  const months = entries
    .filter((e) => e.isDirectory() && MONTH_DIR.test(e.name))
    .map((e) => e.name)
    .sort();
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return [];
  const present = new Set(months);
  const reports: MonthReport[] = [];
  // Skipped months become all-null reports so charts show a gap, not a jump.
  for (let key: string | null = first; key !== null && key <= last; key = nextMonthKey(key)) {
    if (present.has(key)) {
      reports.push(adapter.loadMonth(path.join(root, key)));
    } else {
      console.warn(`[Reports] missing month folder ${key}`);
      reports.push(emptyReport(key));
    }
  }
  return reports;
}

function nextMonthKey(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

function emptyReport(month: string): MonthReport {
  return {
    month,
    sales: null,
    categories: null,
    items: null,
    providers: null,
    clients: null,
    rebooking: null,
    memberships: null,
  };
}
