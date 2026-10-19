# Monthly Reports — wellness spa demo

A password-protected, single-page **Monthly Reports** dashboard for a natural/eco wellness spa,
built as a sales demo for prospective spa owners. It runs on **fictional, seeded data**
(the default business, "Juniper & Moss Wellness Spa", is made up) and shows a "Sample data" pill
while in demo mode, so a screenshot can never be mistaken for real figures.

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Recharts 3 · Vitest · deployed on Netlify.

- No database, no client-side data fetching, no analytics, no third-party scripts, no AI calls.
- Report files are read **at build time** by a server component, so `/` is statically
  prerendered. A new month appears on the next deploy.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (no password needed unless SITE_PASSWORD is set)
```

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (the page should show as `○ (Static)`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + component tests |
| `npm run test:coverage` | Tests with coverage (≥ 80% enforced on `lib/*` and `middleware.ts`) |
| `npm run generate` | Regenerate the demo data (see below) |

> Don't run `npm run build` while `npm run dev` is running — they share `.next` and the build
> will report bogus prerender errors. Stop the dev server first.

## Data

Reports live in `reports/YYYY-MM/`, one folder per month:

| File | Shape |
|---|---|
| `sales_summary.csv` | `Label,Amount` — Service Sales, Retail Sales, Membership Revenue, Gift Card Sales, Discounts & Comps, Refunds, Gift Card Redemptions, Processing Fees, Net Sales |
| `category_sales.csv` | `Category,Group,Units Sold,Sub-Total,Discount` (`Group` is `Service` or `Retail`; Sub-Total is before discounts) |
| `item_sales.csv` | `Item,Category,Group,Add-on,Units Sold,Sub-Total,Discount,Net` |
| `provider_sales.csv` | `Provider,Role,Appointments,Hours Booked,Hours Available,Service Sales,Retail Sales,Rebooked` |
| `clients.json` | `{ new_clients, returning_clients, total_clients }` |
| `rebooking.json` | `{ rebooked, not_rebooked, total_appointments }` |
| `memberships.json` | `{ active_start, new_members, cancelled, active_end, membership_revenue }` |

Any file may be missing in any month. A missing or malformed file is treated as a **gap**
(`null`), never as zero, and is logged at build time as `[Reports] …`.

### Regenerate the demo data

The generator is deterministic (seeded), so the same arguments always produce the same numbers:

```bash
node scripts/generate-demo-reports.mjs --out reports --end 2026-09 --months 12
# or: npm run generate        (same arguments)
# options: --seed <n> for a different (still deterministic) data set
```

Commit the regenerated `reports/` folder; the build reads it from the repo.

### Add a real month

1. Export the month from the POS and save the files into a new folder `reports/YYYY-MM/`
   (e.g. `reports/2026-10/`) using the file names and columns above.
2. Run `npm test` — `lib/reports-data.test.ts` checks that every month reconciles
   (category sub-totals = service + retail sales; provider service sales = service sales;
   provider appointments = total appointments; net sales matches the formula).
3. Commit and deploy. The new month becomes the default in the Month selector.

Money cells may be written as `1424`, `1,424.00` or `$1,424.00`; an empty cell counts as 0.

### A different POS

Parsing sits behind a small adapter interface (`ReportAdapter.loadMonth(dir): MonthReport` in
`lib/reports-types.ts`). Most spas export from Boulevard, Vagaro or Mindbody; write an adapter that
maps that export onto `MonthReport` and pass it to `loadReports` in `lib/reports-source.ts`. The
transforms and charts don't change.

## Rebrand for a pitch

All client-specific values live in `lib/business.ts` and can be overridden per deploy with env vars —
there's no need to edit code to pitch a specific spa:

```ts
export const business = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Juniper & Moss Wellness Spa",
  shortName: process.env.NEXT_PUBLIC_BUSINESS_SHORT ?? "Juniper & Moss",
  isDemo: process.env.NEXT_PUBLIC_DEMO !== "false",
};
```

The dashboard header eyebrow is fixed to "Wellness Spa"; the page title, meta description and
empty-state header use these values. Never commit a real business name to the repo;
set it on that deploy instead. While `isDemo` is true the page shows the "Sample data" pill and sends
`noindex, nofollow`.

## Deploy (Netlify)

`netlify.toml` already configures `npm run build` and `@netlify/plugin-nextjs`.

| Env var | Required | Purpose |
|---|---|---|
| `SITE_PASSWORD` | No | Password for the gate. Unset or empty → the site is public. |
| `NEXT_PUBLIC_BUSINESS_NAME` | No | Business name used in the meta description and empty-state header (the dashboard eyebrow is fixed to "Wellness Spa"). |
| `NEXT_PUBLIC_BUSINESS_SHORT` | No | Short name used in the browser tab title. |
| `NEXT_PUBLIC_DEMO` | No | `false` hides the "Sample data" pill and removes `noindex`. Default: demo mode on. |
| `REPORTS_DIR` | No | Folder of `YYYY-MM` report folders, relative to the repo root. Default: `reports`. |

`NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing them.

## Password gate

`middleware.ts` (Edge runtime) is off unless `SITE_PASSWORD` is set. When set, it protects every
route except Next's static assets and the favicon:

1. A valid `session` cookie → allowed.
2. Otherwise the browser's Basic-auth prompt; any username, correct password → allowed, and a
   `session` cookie (HMAC-SHA256 of a fixed message keyed by `SITE_PASSWORD`; `HttpOnly`,
   `SameSite=Lax`, 7 days, `Secure` in production) is set so the prompt appears only once.
3. Otherwise → `401`.

Changing `SITE_PASSWORD` invalidates every existing session.

## Project layout

```
app/                 layout (fonts, metadata), page (server component: loads reports), globals.css (tokens)
components/ui/       ChartCard, StatTile, BarList, MonthSelect, Section, header
components/charts/   generic Recharts charts (client components)
components/dashboard/ the dashboard sections wired to the data
lib/business.ts      white-label config
lib/reports-*.ts     types, parsing, the file-system adapter, pure transforms
lib/format.ts        all number/month formatting
lib/chart-*.ts       palette and y-axis scale
middleware.ts        password gate
reports/             the (fictional) data, one folder per month
scripts/             the demo-data generator
```
