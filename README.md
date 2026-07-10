# Neon Expense Tracker

A personal expense & income tracker with a dark neon dashboard, live analytics, budgets, a running-balance ledger, AI receipt OCR, and CSV / Excel / PDF exports.

Built with **TanStack Start (React 19)**, **Tailwind v4**, **Lovable Cloud (Supabase)**, and **Recharts**. Mobile-first, installable-feeling UI with a translucent bottom nav and drawer sidebar.

**Live demo:**  https://expensetracker.zulqarnain3.workers.dev/auth

---

## Features

- **Auth** — Email + password. Single-user personal tracker.
- **Dashboard** — KPI cards (Today / Week / Month / Year) with Δ% vs previous period, daily-spend line chart with prior-period overlay, 12-month area chart, category donut, income-vs-expense bars, savings rate, and budget progress.
- **Expenses & Income CRUD** — Add / edit / delete with category, date, amount, note. Filter by date range, category, and text search. Responsive card-list on mobile, table on desktop.
- **Editable categories** — Separate Income and Expense categories with icon picker (Lucide) and color. Defaults seeded on first sign-up (Outing, Dinner, Lunch, Petrol, Online Ride, Shopping, Clothing, Pay).
- **Budgets** — Monthly caps, overall or per-category, with live progress bars.
- **Ledger** — Merged income + expense timeline with a running balance seeded from an editable Opening Balance. Filters by date, type, and category.
- **Exports** — CSV, Excel (.xlsx), and PDF from the Ledger, Expenses, and Income pages. Filenames encode the active date window; exports respect all filters.
- **Receipts** — Attach a file or snap a photo with the phone camera (`capture="environment"`). Stored in a private Supabase Storage bucket with owner-only RLS. Preview + signed-URL view.
- **AI Receipt OCR** — "Auto-fill from receipt (AI)" in the expense dialog. Sends the image to a `createServerFn` handler that calls the Lovable AI Gateway (`google/gemini-2.5-flash`) and returns `{ amount, date, merchant, note }`. Friendly 429 (rate-limit countdown) and 402 (credits) banners.
- **Neon design system** — Deep base `#0a0b14`, cyan / magenta / lime / violet accents, rounded-2xl panels, Space Grotesk + Inter, glow utilities. All tokens live in `src/styles.css`.
- **Mobile-first** — Drawer sidebar (auto-closes on nav), translucent fixed bottom nav (Home / Income / Expenses / Budgets / Categories / Ledger), responsive layouts throughout.

---

## Tech stack

- TanStack Start v1 + TanStack Router (file-based routing) + TanStack Query
- React 19, TypeScript (strict), Vite 7
- Tailwind CSS v4 (`@theme` tokens, no `tailwind.config.js`)
- shadcn/ui (Sidebar, Dialog, Form, Table, Card, …)
- Lovable Cloud — Supabase Auth, Postgres with RLS, Storage
- Recharts — line, area, bar, donut
- date-fns, zod
- `xlsx`, `jspdf` + `jspdf-autotable` — exports
- Lovable AI Gateway (`google/gemini-2.5-flash`) — receipt OCR

---

## Data model

- `profiles(id, display_name, currency, opening_balance)`
- `categories(id, user_id, name, color, icon, kind, sort_order)` — `kind` ∈ `expense | income`
- `expenses(id, user_id, category_id, amount, note, spent_at, receipt_path, …)`
- `incomes(id, user_id, category_id, amount, note, received_at, …)`
- `budgets(id, user_id, category_id?, amount, month)`

RLS scoped to `auth.uid()` on every table, plus `GRANT`s to `authenticated` and `service_role`. A `handle_new_user()` trigger seeds default categories on sign-up. Receipts are stored in a private `receipts` bucket with owner-only policies.

---

## Local development

```bash
bun install
bun run dev
```

The app runs on `http://localhost:8080`. Lovable Cloud (Supabase) is provisioned automatically; env vars land in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `LOVABLE_API_KEY` (server-only; used by the OCR server function)

Do **not** edit files under `src/integrations/supabase/` — they are managed by the Cloud integration.

---

## Project layout

```
src/
  routes/                 file-based routing (TanStack Router)
    __root.tsx            html/head shell + providers
    auth.tsx              sign in / sign up
    _app.tsx              authenticated layout (sidebar + bottom nav)
    _app.dashboard.tsx
    _app.expenses.tsx
    _app.income.tsx
    _app.budgets.tsx
    _app.ledger.tsx
    _app.categories.tsx
    _app.settings.tsx
  components/             sidebar, bottom-nav, dialogs, export-menu, …
  hooks/                  use-auth, use-tracker-data (TanStack Query)
  lib/
    receipt-ocr.functions.ts   createServerFn → Lovable AI Gateway
    export-utils.ts            CSV / XLSX / PDF builders
  integrations/supabase/  auto-generated client + auth helpers
  styles.css              Tailwind v4 tokens + neon utilities
```

---

## Deployment

Recommended: publish through Lovable → served on `*.lovable.app` (or a custom domain). Two-way GitHub sync is available via the Plus menu → GitHub → Connect. Deploying the exported repo to another host (Cloudflare Pages, Vercel, …) is possible, but you lose the managed Lovable Cloud backend (auth + DB + storage + AI Gateway) unless you wire up your own Supabase project and re-set the env vars.

---

## Showcase

See `neon-expense-tracker-showcase_v3.pdf` for a full feature and screenshot deck (cover, feature panels, per-screen desktop showcase, mobile grid, tech stack, and manifest).

---

## License

Personal project. Not licensed for redistribution without permission.
