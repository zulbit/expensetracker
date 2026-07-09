
# Neon Expense Tracker — Plan

A single-user (admin) expense tracker with a dark neon dashboard, sidebar navigation, secure email/password login, editable categories, full CRUD, and live analytics comparing this week/month/year against previous periods.

## Stack
- TanStack Start + React 19 + Tailwind v4 (already scaffolded)
- Lovable Cloud for auth + Postgres + RLS
- Recharts for line/area/bar charts
- shadcn/ui (Sidebar, Dialog, Form, Table, Card, Select, Calendar)
- GitHub sync via Lovable's built-in integration; deploy through Lovable Publish

## Design direction
- **Dark neon.** Deep base `#0a0b14`, panels with subtle gradient, 1px inner borders `rgba(255,255,255,0.06)`.
- **Neon accents:** cyan `#00e5ff`, magenta `#ff2bd6`, lime `#39ff14`, violet `#8b5cf6`, amber `#f59e0b`. Charts use these with soft glow.
- **Corners:** rounded-2xl everywhere.
- **Typography:** Space Grotesk (display) + Inter (body) via `@fontsource`.
- **Motion:** hover glow on cards, chart line draw-in on mount.
- All tokens in `src/styles.css` under `@theme` — no hardcoded colors in components.

## Auth
- Email + password via Lovable Cloud on `/auth` (sign-in + sign-up tabs).
- App routes live under `_authenticated/` (managed layout: `ssr: false`, redirect to `/auth` when no session).
- Sign-out in sidebar footer with proper cache teardown.
- First sign-up seeds profile + 7 default categories via DB trigger (already migrated).

## Data model
Already migrated:
- `profiles(id, display_name, currency default 'PKR')`
- `categories(id, user_id, name, color, icon, sort_order)` — unique `(user_id, name)`
- `expenses(id, user_id, category_id, amount, note, spent_at, timestamps)`
- RLS scoped to `auth.uid()` on all three, GRANTs to authenticated + service_role.
- `handle_new_user()` trigger seeds Outing, Dinner, Lunch, Petrol, Online Ride, Shopping, Clothing.

## Routes
```
/auth                              public sign in / sign up
/_authenticated/                   sidebar shell layout
  ├─ index (Dashboard)             KPI cards + charts + comparisons
  ├─ expenses                      table + filters + CRUD dialogs
  ├─ categories                    editable list (add/rename/recolor/delete)
  └─ settings                      currency + display name + sign out
```
Root `/` redirects to `/_authenticated` (which itself redirects to `/auth` when signed out).

## Dashboard analytics
KPI cards (count-up + Δ% vs previous period): Today, This Week, This Month, This Year.

Charts:
- **Line:** daily spend last 30 days with faint overlay of previous 30 days.
- **Area:** monthly spend last 12 months vs prior 12.
- **Donut/bar:** category breakdown for current month.
- **Comparison strip:** week/month/year vs prior period, each with mini sparkline + Δ.

All aggregations computed client-side from a single `expenses` fetch (last 24 months). Cache updates instantly via `queryClient.invalidateQueries` after any CRUD.

## Expenses CRUD
- Table: date, category chip (colored), amount, note, actions.
- Filters: date range, category multi-select, note search.
- Add/Edit dialog: amount, category select, date picker, note. Zod validation (amount > 0 and ≤ 10^10, note ≤ 500 chars).
- Delete with confirm dialog.
- Optimistic updates via TanStack Query.

## Categories CRUD
- List with color swatch, icon, name, expense count.
- Add / rename / recolor / delete (delete blocked by FK when expenses exist — surface a friendly error).

## Sidebar
- shadcn Sidebar with `collapsible="icon"`, glowing active state.
- Items: Dashboard, Expenses, Categories, Settings.
- Footer: user email + sign-out.
- `SidebarTrigger` in top header so it works even when collapsed.

## Settings
- Currency select (default PKR; PKR/USD/EUR/GBP/INR/AED/SAR + others).
- Display name edit.
- All amount rendering uses `Intl.NumberFormat` with the selected currency.

## Data access pattern
Direct Supabase browser client calls from components (protected by RLS) via TanStack Query hooks — simplest for a single-user personal tracker. No server functions needed for CRUD.

## Hosting / GitHub
Lovable Publish → `*.lovable.app` (custom domain available after first publish). User connects GitHub via Plus menu → GitHub → Create Repository for two-way sync. Note: deploying the exported repo to Cloudflare Pages directly would lose the Cloud backend (auth + DB), so publishing through Lovable is the recommended path — will call this out in the closing note.

## Build order
1. ✅ Enable Lovable Cloud
2. ✅ Migration: profiles, categories, expenses, RLS, GRANTs, seed trigger
3. Install fonts (`@fontsource/space-grotesk`, `@fontsource/inter`) — done
4. Design tokens in `src/styles.css` (neon palette, fonts, glow utilities)
5. Update root head metadata (title "Expense Tracker", description, og tags)
6. `/auth` route (email + password)
7. `_authenticated` layout + AppSidebar
8. Dashboard with KPIs + charts + comparisons
9. Expenses page (table + CRUD)
10. Categories page (CRUD)
11. Settings page
12. Verify build; invite user to publish

## Out of scope (this iteration)
Multi-user/sharing, receipt uploads, budgets/alerts, CSV import/export. Can add later on request.
