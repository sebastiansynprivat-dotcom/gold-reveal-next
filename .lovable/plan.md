## Goal
Remove the fake/hash-based chatter stats and replace them with real numbers derived from the chatter's full assignment history (open + closed). If a chatter has no assignments at all, every stat reads `0`.

## Data sources

- `account_assignments(user_id, profile_id, account_id, start_date, end_date)` — full assignment history. Open windows have `end_date IS NULL`. `user_id` can be null for pre-created profiles, so always match by **either** `user_id = <chatter user_id>` **or** `profile_id = <chatter profile id>` (resolved from `profiles` for the given `user_id`).
- `accounts_data(account_id, date, total, mass_dms, unread_chats, oldest_chat)` — per-day account metrics.

A chatter's revenue on a given day = sum of `accounts_data.total` for every account where `date` falls inside one of that chatter's assignment windows (`start_date` … `end_date` or today if open).

This mirrors the existing `AccountStatsRows.tsx` logic and the `get_chatter_revenue_series` RPC, just expanded to allow `profile_id` matching and not scoped to `auth.uid()`.

## Backend

Add one admin-only RPC `get_chatter_real_stats(p_user_ids uuid[])` returning one row per chatter:

```
user_id, today, week, month, all_time,
prev_week, prev_month,
mass_dms, open_chats, avg_open_days,
sparkline jsonb  -- [{week_start, total}, …] last 8 weeks
```

- Resolve each chatter's `profile_id` from `public.profiles`, then join `account_assignments` on `aa.user_id = p_user_id OR aa.profile_id = profiles.id` so pre-create assignments still count.
- Revenue buckets: `today` (today only), `week` (last 7 days), `month` (current calendar month), `all_time` (since first assignment). `prev_week` / `prev_month` for the % deltas.
- `mass_dms`, `open_chats`, `avg_open_days`: latest `accounts_data` row per **currently open** assignment (`end_date IS NULL`); sum `mass_dms` and `unread_chats`, average `oldest_chat`.
- Sparkline: 8 weekly sums (oldest → newest).
- Chatter with zero matching assignments (no open, no closed) → all zeros, sparkline of 8 zeros.
- `SECURITY DEFINER`, gated by `public.is_admin()`. Granted to `authenticated`.

## Frontend

1. **`src/components/ChatterStatsCard.tsx`** — drop `hashCode` / `generateSparkline` / `useMemo`. Either fetch the new RPC for the single id, or accept a precomputed `stats` prop from the parent. Skeleton while loading; same layout, colors, labels.

2. **`src/pages/AdminDashboard.tsx`**
   - Delete `hashCodeAdmin` and `getChatterFakeStats` (lines ~197-211).
   - Add `chatterRealStats: Record<user_id, Stats>` state, hydrated once via the batched RPC with all visible chatter `user_id`s (refresh when the list changes).
   - Replace the four `getChatterFakeStats(...)` call sites in the sort/filter block (lines 3715-3728) and the `chatsOverdue` red-row check (lines 5570-5571) with lookups into `chatterRealStats`, defaulting to zeros while loading.
   - Pass each chatter's stats row into `ChatterStatsCard` so the expanded card doesn't refetch.

No visual changes beyond removing the fake numbers — same revenue row, trends, sparkline, activity stats, all-time card.

## Edge cases

- Chatter with zero assignments (no `user_id` or `profile_id` match) → all zeros, flat sparkline, no red highlight.
- Chatter only with closed assignments → historical revenue counted; `mass_dms` / `open_chats` / `avg_open_days` are `0` (open-assignment-only).
- Pre-create profile that later gets `user_id` populated → `claim_pre_chatter` already rewrites `account_assignments.user_id`, so future queries match by `user_id`; the `OR profile_id` branch covers anything still unclaimed.
- Sort/filter actions (`top_tag`, `top_woche`, `top_monat`, `open_2d`) operate on real numbers; not-yet-loaded chatters sort as `0`.
