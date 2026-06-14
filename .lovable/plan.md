# Why Reports are slow

The Reports tab fetches everything **sequentially** in one big `useEffect`, with several nested `await` loops. Each `await` is a separate round-trip to the backend, and they all block the next step.

Concretely, for every load it does, in order:

1. `account_assignments` by `user_id` — 1 round-trip
2. `account_assignments` by `profile_id` — 1 round-trip
3. `accounts` in chunks of 100 — N round-trips, **serial**
4. `models` in chunks of 100 — N round-trips, **serial**
5. `profiles_data` — telegram IDs sliced in batches of 50, and **for each batch a paginated `while(true)` loop** of 1000-row pages — many round-trips, fully **serial**
6. `profiles` for goals/start dates — 1 round-trip

With ~268 telegram IDs and ~11.6k `profiles_data` rows today, step 5 alone is ~6 sequential batches × (1+ pages each). Every other step waits for the previous one even though most of them are independent. That stacked latency (not the row count) is what the user sees as a long spinner.

A secondary cost: `profiles_data` is fetched for the **entire history** (only `.lte(selISO)`), which is fine for `all_time` but means every page transfer grows over time even when the visible windows are last week / last month / today.

Indexes on `profiles_data` are already correct (`(telegram_id, date)` unique + per-column), so this is a client-side orchestration problem, not a DB problem.

# Plan

Refactor the loader in `src/components/admin/ChatterReportsTab.tsx` only. No schema changes, no UI changes.

## 1. Parallelize independent fetches

Kick these off together with `Promise.all` instead of serially:

- `account_assignments` by `user_id` **and** by `profile_id` (today: serial → parallel)
- `profiles` (goals/start_date) — independent of assignments, can start immediately
- `profiles_data` — independent of assignments, can start immediately

## 2. Parallelize the chunked sub-fetches

- `accounts` in chunks of 100 → `Promise.all(chunks.map(...))`
- `models` in chunks of 100 → `Promise.all(chunks.map(...))`
- `profiles_data` telegram-ID batches → `Promise.all(batches.map(...))` instead of the outer `for` loop. Keep the inner pagination per batch (it's order-dependent), but run the batches concurrently.

## 3. Pre-aggregate `profiles_data` server-side via an RPC (optional, recommended)

Add a `SECURITY DEFINER` SQL function `report_profile_totals(p_telegram_ids text[], p_as_of date)` that returns, per `telegram_id`:

- `total_by_date jsonb` (date → revenue) limited to a rolling window that covers the widest range we render (last ~5 full months + current = ~180 days),
- `all_time_revenue numeric` (sum ≤ `p_as_of`),
- `latest_date`, `latest_mass_dm`, `latest_unread_chats`, `latest_oldest_chat`.

The client then computes day/week/month/prev/weekly/monthly/streak/sparkline from the 180-day map and uses `all_time_revenue` directly. This:

- Eliminates pagination round-trips entirely (1 RPC, ~268 rows of compact JSON).
- Stops transferring the full row history every load.

If we don't want to introduce an RPC, the parallelization in step 2 alone already removes the dominant serial latency.

## 4. Small client-side tidy

- Move `setLoading(true)` so the spinner appears immediately and a stale render isn't kept.
- Drop the dev-mode invariant warn from the hot path or guard with a single check after aggregation.

## Files touched

- `src/components/admin/ChatterReportsTab.tsx` — refactor the `useEffect` loader only; table, tabs, dialog, export, goal cell untouched.
- (Optional, step 3) one migration adding `report_profile_totals(...)` RPC + `GRANT EXECUTE ... TO authenticated`.

## Expected impact

Step 1+2 alone typically cuts load time by 3–5× because the long serial chain becomes a single wave of parallel requests. Step 3 makes it effectively constant-time as history grows.

## Decision needed

Do you want **(a) parallelization only** (frontend-only, no DB changes), or **(b) parallelization + the `report_profile_totals` RPC** for the biggest win and to keep it fast as `profiles_data` grows?
