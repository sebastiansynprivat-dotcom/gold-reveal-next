## Goal
Add a new admin sidebar tab **Reports**, placed between **Chatter** and **Anfragen**, that renders the same chatter overview table from the screenshot — with a date picker so the table can show a snapshot for any past day. SheX black-and-gold glassmorphism design, matching the existing admin design system.

## What lands in the UI

A new tab in `src/pages/AdminDashboard.tsx`:

- Key: `reports`, label `Reports`, icon `FileBarChart` (lucide), inserted in `allTabItems` between `chatter` and `anfragen`.
- Renders a new component `<ChatterReportsTab />` when `activeTab === "reports"`.

The tab contains:

```
┌ Search Chatters…              [📅 Date picker]   [↓ Download Report]
├──────────────────────────────────────────────────────────────────────
│                          2026-06-12 (selected date)
├──────────────────────────────────────────────────────────────────────
│ NAME | REVENUE (D/W/M + Δ%) | GOAL | STREAK | MASSDM | CHATS UNREAD /
│ OLDEST UNREAD | NOTES | START DATE | REVENUE (ALL TIME)
└──────────────────────────────────────────────────────────────────────
```

Columns match the screenshot exactly:

1. **Name** – `group_name` (uppercase)
2. **Revenue** – stacked D / W / M pills with weekly + monthly Δ% vs previous period (green ↗ / red ↘), as shown
3. **Goal** – read-only pill (taken from existing `daily_goals` data)
4. **Streak** – `X days`
5. **MassDM Sent** – `N DMs Sent` from `accounts_data.mass_dms` for the selected date
6. **Chats Unread / Oldest Unread Chat** – two-line stack
7. **Notes** – read-only `…` (existing note preview, no edit pencil)
8. **Start Date** – `profiles.start_date`
9. **Revenue (All Time)** – cumulative across all assignments

Read-only view (no edit pencils). Search filter matches the existing Chatter tab.

## Date picker behavior

- Default = today.
- Picker = shadcn `Popover` + `Calendar` (single mode, `pointer-events-auto`), gold accent border.
- Changing the date refetches:
  - `accounts_data` totals & activity rows for that date (today / week-ending-that-date / month-of-that-date / all-time-up-to-that-date)
  - `daily_goals` for that date
  - Streak as of that date

Reuse the existing `get_chatter_real_stats` RPC pattern — wrap a small variant client-side: pass the selected date as the "today" anchor by recomputing the same windows in JS over `accounts_data` rows filtered by `account_assignments` windows (same logic as `AccountStatsRows.tsx`). No new DB function required.

## Download Report

Top-right `Download Report` button → generates a CSV of the currently visible table (selected date applied) using existing CSV utility pattern. Filename: `chatter-report-YYYY-MM-DD.csv`.

## Design (SheX system)

- Dark glass container: `bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl`
- Header row: gold uppercase text `text-[hsl(var(--gold))]` (existing token), `tracking-wider text-xs`
- Date badge centered above table on a subtle gold-tinted bar
- Revenue pills: existing white outlined pill style from screenshot
- Δ% chips: green/red with arrow icons, same as Chatter tab
- Row hover: `hover:bg-white/[0.03]`
- Same horizontal scroll/drag behavior as other admin tables

## Files

- **edit** `src/pages/AdminDashboard.tsx`
  - import `FileBarChart` from lucide-react
  - add `reports` to tab type union + insert in `allTabItems` between chatter and anfragen
  - add `{activeTab === "reports" && <ChatterReportsTab chatters={chatters} chatterRealStats={chatterRealStats} />}` render branch
- **new** `src/components/admin/ChatterReportsTab.tsx`
  - props: `chatters: ChatterProfile[]` (export the type from AdminDashboard or duplicate the minimal shape)
  - internal state: `selectedDate`, `search`, fetched `Map<userId, DateStats>`
  - fetches per selected date via `supabase.from('accounts_data')` + `account_assignments` (same windowing as `AccountStatsRows`)
  - CSV export helper inline

## Permissions

Tab visible to the same roles that currently see `chatter` (not in `SUPER_ADMIN_TABS`) — i.e. all admin roles. No RLS or migration changes needed; only reads from already-readable tables.

## Out of scope

- Editing any field from this view (notes, goals, start_date) — Reports is intentionally read-only.
- Historical snapshot of *Notes* or *Goal* values (those reflect current values, since they aren't time-versioned).
