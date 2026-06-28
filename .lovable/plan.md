# Extend `refresh_profiles_data_today` to 3-day window

## Goal
Backfill/refresh `profiles_data` for today + the previous 3 days (4 dates total), so late-arriving `accounts_data` rows propagate into the chatter-facing aggregates. Each date only counts an account if it falls within that chatter's `account_assignments` window for that day.

## Changes

### 1. DB function (migration)
Rewrite `public.refresh_profiles_data_today()` (keep the name for cron/edge-fn compatibility) to loop over `generate_series(current_date - 3, current_date)`:

- For each `d` in the series:
  - Resolve active assignments where `start_date <= d AND (end_date IS NULL OR end_date >= d)` — uses the per-day window, not just today's open assignments.
  - Resolve `telegram_id` via `profile_id` first, fall back to `user_id`'s profile (same logic as today).
  - Join `accounts_data` on `account_id` and `date = d`.
  - Aggregate per `telegram_id` (revenue sum, mass_dm sum, unread_chats sum, oldest_chat max, models jsonb).
  - Upsert into `profiles_data` on `(telegram_id, date)`.
- Return total upserted row count across all 4 days.

Behavior preserved: same columns, same conflict target, same security-definer + search_path.

### 2. Edge function
`supabase/functions/refresh-profiles-data/index.ts` stays as-is — it just calls the RPC and returns `updated_rows`. No code change needed.

### 3. Cron
Existing `refresh-profiles-data-hourly` cron keeps running hourly; it now refreshes 4 days per run instead of 1. No cron change.

## Notes
- Cost: ~4x today's work per run, still trivial (single SQL pass with date series).
- Idempotent: upsert overwrites with latest values, so re-running is safe.
- Does NOT touch dates older than 3 days back — historical rows remain frozen.
