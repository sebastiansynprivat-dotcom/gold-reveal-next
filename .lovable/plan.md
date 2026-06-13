## Goal

Make the Reports tabs strictly platform-scoped:
- Each platform tab lists only chatters who have at least one assignment on a model of **that platform**.
- Stats (D / W / M / All Time / MassDM / Unread / Streak / Goal) are computed using **only** that platform's accounts.
- Chatters with no assignments at all do **not** appear in any tab.

## Why the current tabs feel "unfiltered"

In `ChatterReportsTab.tsx` one `Row` is built per chatter by summing `accounts_data` across **all** their assignments, with `row.platforms` being every platform they ever touched. The tab filter `r.platforms.includes(activePlatform)` therefore passes the same row on every tab it touched, and the totals never change between tabs.

## Plan

### 1. One row per (chatter × platform) — keyed safely

In the data effect:

- Resolve every assignment's platform via the existing `platformByAccount` map.
- Group each chatter's assignments by platform.
- For each `(chatter, platform)` pair that has ≥ 1 assignment, emit one `Row`.
- Compute `day`, `daily[]` (last 10 days), `weekly[]` / `monthly[]` (5 buckets each), `week`, `month`, `prev_week`, `prev_month`, `all_time`, `mass_dms`, `unread`, `oldest`, `streak` using **only** the accounts_data rows whose `account_id` belongs to that platform (and still gated by `inWindow(date)`).
- Replace `Row.platforms: string[]` with `Row.platform: string`.

**Key safety (handles pre_create profiles without user_id):**
Use the profile id as the stable identity, with user_id only as a tiebreaker:
```
row.key = `${c.id ?? c.user_id ?? "anon"}__${platform}`
```
`ChatterProfile.id` (profile id) is always present, so this is unique even for pre_create chatters with `user_id === null`.

### 2. Drop chatters with zero assignments

After the grouping step, a chatter with no assignments produces zero rows and is excluded from every tab automatically. No additional filter needed; we just stop synthesizing the "fallback" row that today's code creates from `chatters` even when no assignment exists.

### 3. Tab filter becomes strict equality

- `platformList` = unique `row.platform` values, sorted.
- `filtered` = `rows.filter(r => r.platform === activePlatform)` + search filter.
- Tab badge = row count per platform.
- CSV download already operates on `filtered` → automatically becomes per-platform.
- If `platformList` is empty, render an empty state ("No chatters with assignments yet").

### 4. Start-date fallback chain

When building each row, set `start_date` to the first non-empty of:

1. `profiles.start_date`
2. `profiles.created_at` (sliced to `YYYY-MM-DD`)
3. `ChatterProfile.created_at` (sliced to `YYYY-MM-DD`)

Extend the local `ChatterLite` shape with `created_at?: string` (already present on `ChatterProfile`, just needs to be passed through).

### 5. No backend changes

All work stays in `src/components/admin/ChatterReportsTab.tsx`. No schema, RLS, or RPC changes — `platformByAccount`, `profiles`, and `accounts_data` are already fetched today; we only re-bucket them.

## Out of scope

- Toolbar, dialogs, and column layout stay as they are.
- "Revenue (All Time)" still capped at the selected date (unchanged).
- No edits to `ChatterOverviewTab` or other admin tabs.
