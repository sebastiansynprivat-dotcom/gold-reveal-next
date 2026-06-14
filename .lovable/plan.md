## Hourly profiles_data refresh

### What gets built

1. **New edge function `refresh-profiles-data`** (`supabase/functions/refresh-profiles-data/index.ts`)
   - Auth: requires header `x-api-key` matching the existing `REVENUE_INGEST_API_KEY` secret. Returns 401 otherwise.
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to run a single SQL aggregation via `supabase.rpc` on a new SECURITY DEFINER function `public.refresh_profiles_data_today()`.
   - Scope: **today only** (`date = current_date`). One row per assigned chatter per day.
   - Returns `{ ok: true, updated_rows: N }`.

2. **New SQL function `public.refresh_profiles_data_today()`** (via migration)
   - Walks every assignment where `end_date IS NULL OR end_date >= current_date`.
   - Resolves `telegram_id` via `profiles` (lookup by `aa.profile_id`, fallback `aa.user_id` → `profiles.user_id`).
   - Aggregates today's `accounts_data` rows joined on `account_id`:
     - `revenue` = `SUM(COALESCE(total, 0))`
     - `mass_dm` = `SUM(COALESCE(mass_dms, 0))`
     - `unread_chats` = `SUM(COALESCE(unread_chats, 0))`
     - `oldest_chat` = `MAX(COALESCE(oldest_chat, 0))`
     - `models` = `jsonb_agg(DISTINCT { model_id, name, account_id, platform, total })`
   - Groups by `(telegram_id, current_date)`, filters out null/empty telegram_ids.
   - Upserts into `profiles_data` `ON CONFLICT (telegram_id, date) DO UPDATE` setting all five aggregates + `models` + `updated_at = now()`.
   - Returns affected row count.

3. **Cron job** via `pg_cron` + `pg_net` (scheduled with `supabase--insert`, not migration — contains project-specific URL + anon key):
   - Name: `refresh-profiles-data-hourly`
   - Schedule: `0 * * * *` (top of every hour)
   - Action: `net.http_post` to `https://acznyhzgbkdcmnbqvptt.supabase.co/functions/v1/refresh-profiles-data` with headers `{ Content-Type, apikey: <anon>, x-api-key: <REVENUE_INGEST_API_KEY> }`.

### Technical notes

- `pg_cron` + `pg_net` extensions: enabled in the migration if not already on.
- The cron job reads `REVENUE_INGEST_API_KEY` as a literal value baked into the cron's SQL body. Rotating the secret later requires re-scheduling the cron.
- No frontend changes. No schema changes to `profiles_data` (already has `(telegram_id, date)` unique key from the backfill).
- Function deploys with `verify_jwt = false` by default; auth is enforced in code via `x-api-key`.

### Files touched

- new: `supabase/functions/refresh-profiles-data/index.ts`
- migration: create `public.refresh_profiles_data_today()` + enable `pg_cron`/`pg_net`
- one-off insert: schedule the cron job
