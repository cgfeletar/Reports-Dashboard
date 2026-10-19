#!/usr/bin/env node
/**
 * generate-demo-reports.mjs — fake monthly reports for a wellness-spa demo.
 *
 * Writes one folder per month (`<out>/YYYY-MM/`) containing:
 *
 *   sales_summary.csv    Label,Amount — the month's money roll-up (see NET SALES below)
 *   category_sales.csv   Category,Group,Units Sold,Sub-Total,Discount
 *   item_sales.csv       Item,Category,Group,Add-on,Units Sold,Sub-Total,Discount,Net
 *                        (Add-on = "Yes" for upsells that ride along with an appointment)
 *   provider_sales.csv   Provider,Role,Appointments,Hours Booked,Hours Available,
 *                        Service Sales,Retail Sales,Rebooked
 *   clients.json         { new_clients, returning_clients, total_clients }
 *   rebooking.json       { rebooked, not_rebooked, total_appointments }
 *   memberships.json     { active_start, new_members, cancelled, active_end, membership_revenue }
 *
 * Everything is internally consistent: categories are sums of items, gross
 * sales is the sum of categories, provider service sales sum to total service
 * sales, rebooking totals equal appointments, and so on. A demo can therefore
 * cross-check its own numbers exactly like a real POS export.
 *
 * NET SALES = Service Sales + Retail Sales + Membership Revenue + Gift Card Sales
 *           − Discounts & Comps − Refunds − Gift Card Redemptions − Processing Fees
 *
 * ALL DATA IS FICTIONAL. Service names and prices are plausible for a natural /
 * eco wellness spa; they are not any real business's figures.
 *
 * Seasonality baked in so the charts tell a story:
 *   - December gift-card + Home & Gifts spike, February (Valentine's) couples bump,
 *     May (Mother's Day) gift-card bump
 *   - Sauna / Soak / Steam busiest in winter, slowest in July–August
 *   - Hair removal peaks in summer
 *   - Slow overall growth (~1%/month) and a gently rising rebooking rate
 *
 * Usage (Node 18+, no dependencies):
 *   node generate-demo-reports.mjs                       # 12 months ending 2026-09 → ./reports
 *   node generate-demo-reports.mjs --out app/reports --end 2026-09 --months 12 --seed 7
 *
 * Same seed ⇒ identical output, so the demo is stable across rebuilds.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const OUT_DIR = path.resolve(args.out ?? "reports");
const END_MONTH = args.end ?? "2026-09";
const MONTH_COUNT = Number(args.months ?? 12);
const SEED = Number(args.seed ?? 7);

if (!/^\d{4}-\d{2}$/.test(END_MONTH) || !(MONTH_COUNT > 0)) {
  console.error("Usage: --end YYYY-MM --months N [--out dir] [--seed n]");
  process.exit(1);
}

// ── Seeded randomness ────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (lo, hi) => lo + (hi - lo) * rand();
/** Multiplicative noise around 1 (e.g. spread 0.12 → roughly 0.88–1.12). */
const jitter = (spread) => 1 + (rand() * 2 - 1) * spread;
const round2 = (n) => Math.round(n * 100) / 100;

// ── Catalog ──────────────────────────────────────────────────────────────────
// base = expected units in an average month; hours = provider time per unit.
// role = who performs it (drives provider_sales.csv). Add-ons ride along with
// another appointment, so they don't count as appointments or add much time.
const SERVICES = [
  // Facials
  {
    item: "Signature Holistic Facial",
    category: "Facials",
    price: 145,
    base: 70,
    hours: 1,
    role: "Esthetician",
  },
  {
    item: "HydraFacial",
    category: "Facials",
    price: 199,
    base: 48,
    hours: 1,
    role: "Esthetician",
  },
  {
    item: "Microcurrent Lift Facial",
    category: "Facials",
    price: 175,
    base: 26,
    hours: 1.25,
    role: "Esthetician",
  },
  {
    item: "Express Glow Facial",
    category: "Facials",
    price: 85,
    base: 34,
    hours: 0.5,
    role: "Esthetician",
  },
  {
    item: "Teen Clarity Facial",
    category: "Facials",
    price: 75,
    base: 10,
    hours: 0.75,
    role: "Esthetician",
  },
  // Skin Peels
  {
    item: "Enzyme Peel",
    category: "Skin Peels",
    price: 95,
    base: 16,
    hours: 0.75,
    role: "Esthetician",
  },
  {
    item: "Lactic Brightening Peel",
    category: "Skin Peels",
    price: 120,
    base: 12,
    hours: 0.75,
    role: "Esthetician",
  },
  // Massage
  {
    item: "Swedish Massage 60 min",
    category: "Massage",
    price: 125,
    base: 64,
    hours: 1,
    role: "Massage Therapist",
  },
  {
    item: "Swedish Massage 90 min",
    category: "Massage",
    price: 175,
    base: 30,
    hours: 1.5,
    role: "Massage Therapist",
  },
  {
    item: "Deep Tissue Massage 60 min",
    category: "Massage",
    price: 135,
    base: 52,
    hours: 1,
    role: "Massage Therapist",
  },
  {
    item: "Hot Stone Massage 90 min",
    category: "Massage",
    price: 190,
    base: 20,
    hours: 1.5,
    role: "Massage Therapist",
  },
  {
    item: "Aromatherapy Massage 60 min",
    category: "Massage",
    price: 130,
    base: 28,
    hours: 1,
    role: "Massage Therapist",
  },
  {
    item: "Prenatal Massage 60 min",
    category: "Massage",
    price: 130,
    base: 14,
    hours: 1,
    role: "Massage Therapist",
  },
  {
    item: "Couples Massage 60 min",
    category: "Massage",
    price: 260,
    base: 12,
    hours: 2,
    role: "Massage Therapist",
    tags: ["couples"],
  },
  // Body Treatments
  {
    item: "Botanical Body Scrub",
    category: "Body Treatments",
    price: 120,
    base: 16,
    hours: 1,
    role: "Massage Therapist",
  },
  {
    item: "Detox Clay Wrap",
    category: "Body Treatments",
    price: 150,
    base: 9,
    hours: 1.25,
    role: "Massage Therapist",
  },
  // Sauna, Soak + Steam (self-guided private studio, priced per person)
  {
    item: "Sauna, Soak + Steam (2 hr, per person)",
    category: "Sauna, Soak + Steam",
    price: 215,
    base: 40,
    hours: 0,
    role: "Self-guided",
    tags: ["sauna"],
  },
  {
    item: "Facial & Soak Ritual (2 hr, per person)",
    category: "Sauna, Soak + Steam",
    price: 232,
    base: 14,
    hours: 0,
    role: "Self-guided",
    tags: ["sauna"],
  },
  {
    item: "Scrub Flight & Soak Ritual (2 hr, per person)",
    category: "Sauna, Soak + Steam",
    price: 232,
    base: 12,
    hours: 0,
    role: "Self-guided",
    tags: ["sauna"],
  },
  {
    item: "Extra Hour in the Studio",
    category: "Sauna, Soak + Steam",
    price: 100,
    base: 10,
    hours: 0,
    role: "Self-guided",
    tags: ["sauna", "addon"],
  },
  // Hands + Feet
  {
    item: "Natural Manicure",
    category: "Hands + Feet",
    price: 55,
    base: 30,
    hours: 0.75,
    role: "Nail Technician",
  },
  {
    item: "Spa Pedicure",
    category: "Hands + Feet",
    price: 75,
    base: 38,
    hours: 1,
    role: "Nail Technician",
    tags: ["summer"],
  },
  {
    item: "Gel Polish Upgrade",
    category: "Hands + Feet",
    price: 20,
    base: 22,
    hours: 0.25,
    role: "Nail Technician",
    tags: ["addon"],
  },
  // Hair Removal
  {
    item: "Brow Wax",
    category: "Hair Removal",
    price: 28,
    base: 44,
    hours: 0.25,
    role: "Lash & Brow Artist",
  },
  {
    item: "Bikini Wax",
    category: "Hair Removal",
    price: 55,
    base: 20,
    hours: 0.5,
    role: "Esthetician",
    tags: ["summer"],
  },
  {
    item: "Brazilian Wax",
    category: "Hair Removal",
    price: 75,
    base: 24,
    hours: 0.5,
    role: "Esthetician",
    tags: ["summer"],
  },
  {
    item: "Full Leg Wax",
    category: "Hair Removal",
    price: 85,
    base: 10,
    hours: 0.75,
    role: "Esthetician",
    tags: ["summer"],
  },
  // Lashes + Brows
  {
    item: "Lash Lift & Tint",
    category: "Lashes + Brows",
    price: 95,
    base: 26,
    hours: 1,
    role: "Lash & Brow Artist",
  },
  {
    item: "Brow Lamination",
    category: "Lashes + Brows",
    price: 85,
    base: 18,
    hours: 0.75,
    role: "Lash & Brow Artist",
  },
  {
    item: "Brow Tint",
    category: "Lashes + Brows",
    price: 25,
    base: 22,
    hours: 0.25,
    role: "Lash & Brow Artist",
    tags: ["addon"],
  },
  // Add-ons
  {
    item: "Scalp Massage Add-on",
    category: "Add-ons",
    price: 25,
    base: 46,
    hours: 0.25,
    role: "Massage Therapist",
    tags: ["addon"],
  },
  {
    item: "CBD Oil Upgrade",
    category: "Add-ons",
    price: 20,
    base: 38,
    hours: 0,
    role: "Massage Therapist",
    tags: ["addon"],
  },
  {
    item: "LED Light Therapy Add-on",
    category: "Add-ons",
    price: 35,
    base: 30,
    hours: 0.25,
    role: "Esthetician",
    tags: ["addon"],
  },
  // Tarot + Astrology
  {
    item: "Tarot Reading (30 min)",
    category: "Tarot + Astrology",
    price: 65,
    base: 14,
    hours: 0.5,
    role: "Tarot Reader",
  },
  {
    item: "Birth Chart Reading (60 min)",
    category: "Tarot + Astrology",
    price: 95,
    base: 7,
    hours: 1,
    role: "Tarot Reader",
  },
];

const RETAIL = [
  { item: "Rosehip Face Serum", category: "Skincare", price: 68, base: 26 },
  { item: "Gentle Oat Cleanser", category: "Skincare", price: 34, base: 30 },
  {
    item: "Daily Barrier Moisturizer",
    category: "Skincare",
    price: 52,
    base: 22,
  },
  {
    item: "Mineral SPF 30",
    category: "Skincare",
    price: 38,
    base: 20,
    tags: ["summer"],
  },
  { item: "Lavender Body Oil", category: "Bath + Body", price: 42, base: 18 },
  {
    item: "Mineral Bath Soak",
    category: "Bath + Body",
    price: 28,
    base: 24,
    tags: ["winter"],
  },
  { item: "Whipped Body Butter", category: "Bath + Body", price: 36, base: 16 },
  { item: "Non-Toxic Nail Polish", category: "Nails", price: 14, base: 30 },
  { item: "Cuticle Oil", category: "Nails", price: 18, base: 14 },
  {
    item: "Soy Botanical Candle",
    category: "Home + Gifts",
    price: 38,
    base: 16,
    tags: ["gift"],
  },
  {
    item: "Self-Care Gift Set",
    category: "Home + Gifts",
    price: 85,
    base: 7,
    tags: ["gift"],
  },
];

// Roster: role → staff. `share` = fraction of that role's work they do.
const PROVIDERS = [
  { name: "Ava Lindqvist", role: "Esthetician", share: 0.4 },
  { name: "Luna Okafor", role: "Esthetician", share: 0.35 },
  { name: "Mae Torres", role: "Esthetician", share: 0.25 },
  { name: "Marco Bell", role: "Massage Therapist", share: 0.38 },
  { name: "Priya Shah", role: "Massage Therapist", share: 0.34 },
  { name: "Jess Moreau", role: "Massage Therapist", share: 0.28 },
  { name: "Sage Nguyen", role: "Nail Technician", share: 1 },
  { name: "Wren Castillo", role: "Lash & Brow Artist", share: 1 },
  { name: "Rowan Hale", role: "Tarot Reader", share: 1 },
  { name: "Retreat Studio", role: "Self-guided", share: 1 },
  { name: "Front Desk", role: "Front Desk", share: 1 },
];

// ── Seasonality (index 0 = January) ─────────────────────────────────────────
const OVERALL = [
  0.9, 1.12, 1.0, 1.0, 1.1, 0.96, 0.88, 0.9, 0.97, 1.0, 1.05, 1.22,
];
const SAUNA = [
  1.3, 1.3, 1.1, 0.95, 0.85, 0.75, 0.68, 0.7, 0.85, 1.05, 1.2, 1.4,
];
const SUMMER = [0.75, 0.8, 0.9, 1.0, 1.15, 1.3, 1.35, 1.3, 1.05, 0.9, 0.8, 0.8];
const WINTER = [
  1.25, 1.15, 1.0, 0.9, 0.85, 0.8, 0.75, 0.8, 0.9, 1.05, 1.2, 1.35,
];
const GIFT_RETAIL = [
  0.7, 1.2, 0.8, 0.85, 1.4, 0.8, 0.75, 0.8, 0.85, 0.95, 1.4, 2.6,
];
const COUPLES = [0.9, 2.2, 1.0, 1.0, 1.1, 1.0, 0.9, 0.9, 1.0, 1.0, 1.0, 1.3];
const GIFT_CARDS = [0.6, 1.6, 0.8, 0.8, 1.8, 0.9, 0.7, 0.7, 0.8, 0.9, 1.5, 4.2];

function seasonFor(entry, monthIndex) {
  const tags = entry.tags ?? [];
  let factor = OVERALL[monthIndex];
  if (tags.includes("sauna")) factor *= SAUNA[monthIndex];
  if (tags.includes("summer")) factor *= SUMMER[monthIndex];
  if (tags.includes("winter")) factor *= WINTER[monthIndex];
  if (tags.includes("gift")) factor *= GIFT_RETAIL[monthIndex];
  if (tags.includes("couples")) factor *= COUPLES[monthIndex];
  return factor;
}

// ── Month list ───────────────────────────────────────────────────────────────
function monthKeys(end, count) {
  const [endYear, endMonth] = end.split("-").map(Number);
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const total = endYear * 12 + (endMonth - 1) - offset;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return keys;
}

// ── CSV helper ───────────────────────────────────────────────────────────────
function toCsv(rows) {
  return (
    rows
      .map((row) =>
        row
          .map((cell) => {
            const text = typeof cell === "number" ? String(cell) : cell;
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(","),
      )
      .join("\n") + "\n"
  );
}

// ── Generate ─────────────────────────────────────────────────────────────────
const months = monthKeys(END_MONTH, MONTH_COUNT);
let activeMembers = 138;
const MEMBERSHIP_PRICE = 99;

months.forEach((month, index) => {
  const monthIndex = Number(month.slice(5)) - 1;
  const growth = 1 + 0.01 * index;
  const dir = path.join(OUT_DIR, month);
  mkdirSync(dir, { recursive: true });

  // Items → units, gross, discount, net.
  const items = [
    ...SERVICES.map((s) => ({ ...s, group: "Service" })),
    ...RETAIL.map((r) => ({
      ...r,
      group: "Retail",
      role: "Front Desk",
      hours: 0,
    })),
  ].map((entry) => {
    const expected = entry.base * seasonFor(entry, monthIndex) * growth;
    const units = Math.max(0, Math.round(expected * jitter(0.14)));
    const subTotal = round2(units * entry.price);
    const discountRate =
      entry.group === "Retail" ? between(0.04, 0.1) : between(0.03, 0.08);
    const discount = round2(subTotal * discountRate);
    return {
      ...entry,
      units,
      subTotal,
      discount,
      net: round2(subTotal - discount),
    };
  });

  writeFileSync(
    path.join(dir, "item_sales.csv"),
    toCsv([
      [
        "Item",
        "Category",
        "Group",
        "Add-on",
        "Units Sold",
        "Sub-Total",
        "Discount",
        "Net",
      ],
      ...items.map((i) => [
        i.item,
        i.category,
        i.group,
        (i.tags ?? []).includes("addon") ? "Yes" : "No",
        i.units,
        i.subTotal.toFixed(2),
        i.discount.toFixed(2),
        i.net.toFixed(2),
      ]),
    ]),
  );

  // Categories = sums of their items.
  const categories = new Map();
  for (const i of items) {
    const c = categories.get(i.category) ?? {
      category: i.category,
      group: i.group,
      units: 0,
      subTotal: 0,
      discount: 0,
    };
    c.units += i.units;
    c.subTotal = round2(c.subTotal + i.subTotal);
    c.discount = round2(c.discount + i.discount);
    categories.set(i.category, c);
  }
  writeFileSync(
    path.join(dir, "category_sales.csv"),
    toCsv([
      ["Category", "Group", "Units Sold", "Sub-Total", "Discount"],
      ...[...categories.values()].map((c) => [
        c.category,
        c.group,
        c.units,
        c.subTotal.toFixed(2),
        c.discount.toFixed(2),
      ]),
    ]),
  );

  // Appointments = service units that aren't add-ons (add-ons ride along).
  const serviceItems = items.filter((i) => i.group === "Service");
  const appointmentItems = serviceItems.filter(
    (i) => !(i.tags ?? []).includes("addon"),
  );
  const appointments = appointmentItems.reduce((sum, i) => sum + i.units, 0);

  // Rebooking: gently rising trend with noise; totals reconcile with appointments.
  const rebookRate = Math.min(0.62, (0.38 + 0.008 * index) * jitter(0.05));
  const rebooked = Math.round(appointments * rebookRate);

  // Providers: split each role's work by share, with a little per-month wobble.
  const providerRows = PROVIDERS.map((p) => ({
    ...p,
    appts: 0,
    hours: 0,
    serviceSales: 0,
    retailSales: 0,
    rebooked: 0,
  }));
  for (const i of serviceItems) {
    const staff = providerRows.filter((p) => p.role === i.role);
    const weights = staff.map((p) => p.share * jitter(0.15));
    const weightTotal = weights.reduce((a, b) => a + b, 0);
    let unitsLeft = i.units;
    staff.forEach((p, k) => {
      const units =
        k === staff.length - 1
          ? unitsLeft
          : Math.round((i.units * weights[k]) / weightTotal);
      unitsLeft -= units;
      if (!(i.tags ?? []).includes("addon")) p.appts += units;
      p.hours += units * i.hours;
      p.serviceSales = round2(p.serviceSales + units * i.price);
    });
  }
  // Rebooked split by appointment share (the last staffed row absorbs rounding).
  let rebookLeft = rebooked;
  const withAppts = providerRows.filter((p) => p.appts > 0);
  withAppts.forEach((p, k) => {
    const share =
      k === withAppts.length - 1
        ? rebookLeft
        : Math.round(((rebooked * p.appts) / appointments) * jitter(0.08));
    p.rebooked = Math.max(0, Math.min(p.appts, share));
    rebookLeft -= p.rebooked;
  });
  // Retail: providers recommend products at checkout; the front desk sells the rest.
  const retailGross = round2(
    items
      .filter((i) => i.group === "Retail")
      .reduce((sum, i) => sum + i.subTotal, 0),
  );
  let retailLeft = retailGross;
  for (const p of providerRows) {
    if (
      [
        "Esthetician",
        "Massage Therapist",
        "Nail Technician",
        "Lash & Brow Artist",
      ].includes(p.role)
    ) {
      const amount = round2(
        retailGross *
          (p.role === "Esthetician" ? 0.13 : 0.04) *
          p.share *
          jitter(0.3),
      );
      p.retailSales = amount;
      retailLeft = round2(retailLeft - amount);
    }
  }
  providerRows.find((p) => p.role === "Front Desk").retailSales =
    round2(retailLeft);

  writeFileSync(
    path.join(dir, "provider_sales.csv"),
    toCsv([
      [
        "Provider",
        "Role",
        "Appointments",
        "Hours Booked",
        "Hours Available",
        "Service Sales",
        "Retail Sales",
        "Rebooked",
      ],
      ...providerRows.map((p) => {
        const staffed = !["Self-guided", "Front Desk"].includes(p.role);
        const hoursBooked = round2(p.hours);
        const hoursAvailable = staffed
          ? Math.max(hoursBooked, Math.round(hoursBooked / between(0.62, 0.9)))
          : 0;
        return [
          p.name,
          p.role,
          p.appts,
          hoursBooked,
          hoursAvailable,
          p.serviceSales.toFixed(2),
          p.retailSales.toFixed(2),
          p.rebooked,
        ];
      }),
    ]),
  );

  // Clients: unique visitors; gift-card months bring more first-timers.
  const totalClients = Math.round((appointments / between(1.25, 1.45)) * 1);
  const newShare = Math.min(
    0.4,
    0.17 * (GIFT_CARDS[monthIndex] > 1.4 ? 1.45 : 1) * jitter(0.12),
  );
  const newClients = Math.round(totalClients * newShare);
  writeFileSync(
    path.join(dir, "clients.json"),
    JSON.stringify(
      {
        new_clients: newClients,
        returning_clients: totalClients - newClients,
        total_clients: totalClients,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    path.join(dir, "rebooking.json"),
    JSON.stringify(
      {
        rebooked,
        not_rebooked: appointments - rebooked,
        total_appointments: appointments,
      },
      null,
      2,
    ) + "\n",
  );

  // Memberships.
  const activeStart = activeMembers;
  const newMembers = Math.round(between(10, 20) * (monthIndex === 0 ? 1.6 : 1));
  const cancelled = Math.round(between(5, 11));
  activeMembers = activeStart + newMembers - cancelled;
  const membershipRevenue = round2(activeMembers * MEMBERSHIP_PRICE);
  writeFileSync(
    path.join(dir, "memberships.json"),
    JSON.stringify(
      {
        active_start: activeStart,
        new_members: newMembers,
        cancelled,
        active_end: activeMembers,
        membership_revenue: membershipRevenue,
      },
      null,
      2,
    ) + "\n",
  );

  // Summary roll-up (labels are what the dashboard should match on).
  const serviceGross = round2(
    serviceItems.reduce((sum, i) => sum + i.subTotal, 0),
  );
  const discounts = round2(items.reduce((sum, i) => sum + i.discount, 0));
  const giftCardSales = round2(
    2600 * GIFT_CARDS[monthIndex] * growth * jitter(0.12),
  );
  const giftCardRedemptions = round2(
    2300 *
      (monthIndex === 0 || monthIndex === 1 ? 1.5 : 1) *
      growth *
      jitter(0.15),
  );
  const refunds = round2(between(0, 450));
  const collected =
    serviceGross +
    retailGross +
    membershipRevenue +
    giftCardSales -
    discounts -
    refunds;
  const processingFees = round2(collected * 0.027);
  const netSales = round2(collected - giftCardRedemptions - processingFees);

  writeFileSync(
    path.join(dir, "sales_summary.csv"),
    toCsv([
      ["Label", "Amount"],
      ["Service Sales", serviceGross.toFixed(2)],
      ["Retail Sales", retailGross.toFixed(2)],
      ["Membership Revenue", membershipRevenue.toFixed(2)],
      ["Gift Card Sales", giftCardSales.toFixed(2)],
      ["Discounts & Comps", discounts.toFixed(2)],
      ["Refunds", refunds.toFixed(2)],
      ["Gift Card Redemptions", giftCardRedemptions.toFixed(2)],
      ["Processing Fees", processingFees.toFixed(2)],
      ["Net Sales", netSales.toFixed(2)],
    ]),
  );

  console.log(
    `${month}  net $${netSales.toFixed(0).padStart(6)}  appts ${String(appointments).padStart(4)}  clients ${totalClients}  members ${activeMembers}`,
  );
});

console.log(`\nWrote ${months.length} months to ${OUT_DIR}`);
