// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { csvJsonAdapter, loadReports } from "./reports-source";
import type { MonthReport, ReportAdapter } from "./reports-types";

let root: string;
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "reports-"));
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  warn.mockRestore();
  vi.unstubAllEnvs();
});

function write(month: string, file: string, content: string) {
  fs.mkdirSync(path.join(root, month), { recursive: true });
  fs.writeFileSync(path.join(root, month, file), content);
}

describe("csvJsonAdapter.loadMonth", () => {
  it("reads every file and names the month after the folder", () => {
    write("2026-01", "sales_summary.csv", "Label,Amount\nNet Sales,100\n");
    write("2026-01", "category_sales.csv", 'Category,Group,Units Sold,Sub-Total,Discount\n"Sauna, Soak + Steam",Service,1,2,0\n');
    write("2026-01", "item_sales.csv", "Item,Category,Group,Add-on,Units Sold,Sub-Total,Discount,Net\nA,B,Service,No,1,1,0,1\n");
    write("2026-01", "provider_sales.csv", "Provider,Role,Appointments,Hours Booked,Hours Available,Service Sales,Retail Sales,Rebooked\nA,R,1,1,1,1,1,1\n");
    write("2026-01", "clients.json", '{"new_clients":1,"returning_clients":2,"total_clients":3}');
    write("2026-01", "rebooking.json", '{"rebooked":1,"not_rebooked":2,"total_appointments":3}');
    write("2026-01", "memberships.json", '{"active_start":1,"new_members":1,"cancelled":0,"active_end":2,"membership_revenue":5}');
    const report = csvJsonAdapter.loadMonth(path.join(root, "2026-01"));
    expect(report.month).toBe("2026-01");
    expect(report.sales?.netSales).toBe(100);
    expect(report.categories?.[0]?.category).toBe("Sauna, Soak + Steam");
    expect(report.items).toHaveLength(1);
    expect(report.providers).toHaveLength(1);
    expect(report.clients?.totalClients).toBe(3);
    expect(report.rebooking?.totalAppointments).toBe(3);
    expect(report.memberships?.activeEnd).toBe(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it("gives null (silently) for missing files", () => {
    write("2026-02", "clients.json", '{"new_clients":1,"returning_clients":2,"total_clients":3}');
    const report = csvJsonAdapter.loadMonth(path.join(root, "2026-02"));
    expect(report.clients).not.toBeNull();
    expect(report.sales).toBeNull();
    expect(report.categories).toBeNull();
    expect(report.items).toBeNull();
    expect(report.providers).toBeNull();
    expect(report.rebooking).toBeNull();
    expect(report.memberships).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("gives null and warns for garbage or unreadable files", () => {
    write("2026-03", "clients.json", "{garbage");
    write("2026-03", "sales_summary.csv", "totally,wrong\n1,2\n");
    fs.mkdirSync(path.join(root, "2026-03", "rebooking.json")); // a directory where a file should be
    const report = csvJsonAdapter.loadMonth(path.join(root, "2026-03"));
    expect(report.clients).toBeNull();
    expect(report.sales).toBeNull();
    expect(report.rebooking).toBeNull();
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes("[Reports] 2026-03/clients.json"))).toBe(true);
    expect(messages.some((m) => m.includes("[Reports] 2026-03/rebooking.json"))).toBe(true);
  });
});

describe("loadReports", () => {
  it("loads only YYYY-MM folders, sorted oldest to newest", () => {
    for (const m of ["2026-03", "2025-12", "2026-01"]) write(m, "clients.json", '{"new_clients":1,"returning_clients":2,"total_clients":3}');
    fs.mkdirSync(path.join(root, "notes"));
    fs.mkdirSync(path.join(root, "2026-3"));
    fs.mkdirSync(path.join(root, "2026-01-extra"));
    fs.writeFileSync(path.join(root, "2026-05"), "a file, not a folder");
    expect(loadReports({ root }).map((r) => r.month)).toEqual(["2025-12", "2026-01", "2026-02", "2026-03"]);
  });

  it("fills skipped months with an all-null report and warns", () => {
    for (const m of ["2025-11", "2026-02"]) write(m, "clients.json", '{"new_clients":1,"returning_clients":2,"total_clients":3}');
    const reports = loadReports({ root });
    expect(reports.map((r) => r.month)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(reports[1]).toEqual({
      month: "2025-12",
      sales: null,
      categories: null,
      items: null,
      providers: null,
      clients: null,
      rebooking: null,
      memberships: null,
    });
    expect(reports[0]?.clients).not.toBeNull();
    expect(warn).toHaveBeenCalledWith("[Reports] missing month folder 2025-12");
    expect(warn).toHaveBeenCalledWith("[Reports] missing month folder 2026-01");
  });

  it("returns [] and warns when the root is missing", () => {
    expect(loadReports({ root: path.join(root, "nope") })).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Reports]"));
  });

  it("uses REPORTS_DIR (relative paths resolve against cwd) and an injected adapter", () => {
    write("2026-02", "clients.json", "{}");
    vi.stubEnv("REPORTS_DIR", root);
    expect(loadReports().map((r) => r.month)).toEqual(["2026-02"]);

    vi.stubEnv("REPORTS_DIR", path.relative(process.cwd(), root));
    expect(loadReports().map((r) => r.month)).toEqual(["2026-02"]);

    const adapter: ReportAdapter = {
      loadMonth: (dir): MonthReport => ({
        month: `x-${path.basename(dir)}`,
        sales: null,
        categories: null,
        items: null,
        providers: null,
        clients: null,
        rebooking: null,
        memberships: null,
      }),
    };
    expect(loadReports({ adapter }).map((r) => r.month)).toEqual(["x-2026-02"]);
  });

  it("defaults to ./reports when REPORTS_DIR is unset", () => {
    vi.stubEnv("REPORTS_DIR", "");
    delete process.env.REPORTS_DIR;
    expect(loadReports().length).toBeGreaterThan(0);
  });
});
