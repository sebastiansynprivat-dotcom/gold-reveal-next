## Reports tables + ingest edge functions

### 1. Migration — two new tables

**`public.message_reports`**
- `id` uuid pk
- `account_id` uuid not null
- `date` date not null
- `main` integer not null default 0
- `follow` integer not null default 0
- `total` integer **generated always as (`main + follow`) stored** — always equals sent + follow, cannot be set independently
- `created_at`, `updated_at` timestamptz
- Unique: `(account_id, date)` so upsert by account+day is clean
- Index on `(account_id, date desc)` for fast last-7-days lookup

**`public.post_reports`**
- `id` uuid pk
- `account_id` uuid not null
- `date` date not null
- `posted` integer not null default 0
- `failed` integer not null default 0
- `created_at`, `updated_at` timestamptz
- Unique: `(account_id, date)`
- Index on `(account_id, date desc)`

**GRANTs (both tables):**
- `authenticated`: SELECT, INSERT, UPDATE, DELETE
- `service_role`: ALL
- No `anon`.

**RLS (mirror existing `accounts` pattern):**
- Super admins: ALL via `has_role(auth.uid(),'super_admin')`
- Sub admins: SELECT/UPDATE via `can_access_account(auth.uid(), account_id)`
- Assigned chatter: SELECT where `account_id` is one they're assigned to
- Models: SELECT via `model_users` membership
- Service role bypasses RLS, so edge function upserts are unaffected

`updated_at` trigger on both using existing `public.update_updated_at_column()`.

### 2. Edge functions

Two new functions, both auth'd via header `x-api-key` matching the existing `REVENUE_INGEST_API_KEY` secret (same pattern as `ingest-revenue` / `ingest-daily-revenue`). Both use `SUPABASE_SERVICE_ROLE_KEY` to upsert.

**`supabase/functions/ingest-message-reports/index.ts`**
- POST, accepts a single row or array:
  ```
  { account_id: uuid, date: "YYYY-MM-DD", main: number, follow: number }
  ```
- Validates UUID, date format, non-negative integers
- **`total` is NOT accepted from the client** — it's a generated column (`main + follow`) in the DB
- `supabase.from("message_reports").upsert(rows, { onConflict: "account_id,date" })`
- Returns `{ success, count, rows }` (selected rows include the computed `total`)

**`supabase/functions/ingest-post-reports/index.ts`**
- POST, accepts a single row or array:
  ```
  { account_id: uuid, date: "YYYY-MM-DD", posted: number, failed: number }
  ```
- Same validation pattern
- Upsert on `(account_id, date)`
- Returns `{ success, count, rows }`

Both include the standard CORS block, OPTIONS handler, and JSON error responses used by the existing ingest functions. No `supabase/config.toml` change needed (default `verify_jwt = false` already applies).

### 3. UI wiring — out of scope here
The "last 7 days" grid hookup in `AdminDashboard.tsx` will happen in a separate step once data is flowing. This plan only delivers schema + ingest endpoints.

### Technical notes
- Tables store **daily aggregates** (one row per account per day) — matches the "last 7 days" UI and makes the remote scraper idempotent via upsert.
- `total` being a generated column guarantees it's always exactly `main + follow` — no drift possible from a buggy client.
- No FK from `account_id` → `accounts.id` to stay consistent with existing tables in this project; integrity is enforced by RLS + the ingest validator.
