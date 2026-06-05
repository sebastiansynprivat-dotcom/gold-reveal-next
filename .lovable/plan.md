## Plan: Rename `accounts_revenue` → `accounts_data`, add fields, rename + extend edge function

### 1. Database migration
- Rename table `public.accounts_revenue` → `public.accounts_data` (preserves rows, indexes, policies, unique constraint, FKs).
- Add nullable columns:
  - `followers` integer
  - `subscribers` integer
  - `oldest_chat` integer
  - `unread_chats` integer
  - `mass_dms` integer
- Existing columns (`account_id`, `date`, `platform`, `total`, `amounts`) and the `(account_id, date, platform)` unique constraint stay untouched.
- Re-assert GRANTs for `authenticated` and `service_role` on the renamed table.

### 2. Edge function rename + extension
- Create `supabase/functions/ingest-account-data/index.ts` (replaces `ingest-account-revenue`).
- Delete the old `ingest-account-revenue` function.
- Update `supabase/config.toml`: remove old entry, add `[functions.ingest-account-data]` with `verify_jwt = false`.
- Keep existing auth (`REVENUE_INGEST_API_KEY`), CORS, batching, grouping by `(account_id, date, platform)`, dedupe-by-`purchase_id`, and response shape.
- Extend payload schema — each row may include (all optional except the existing required ones):
  - `purchase_id` + `amount` → revenue entry (existing behavior, still dedup'd)
  - `followers`, `subscribers`, `oldest_chat`, `unread_chats`, `mass_dms` (all integers)
- Validation:
  - Revenue fields (`purchase_id`, `amount`) become optional; a row must contain either a revenue entry OR at least one metric field.
  - Type-check each metric field when present (integer); reject invalid types with 400.
- Upsert logic per `(account_id, date, platform)` group:
  - Merge revenue as today (sum new amounts into `total`, append deduped entries to `amounts`).
  - For metric fields: take the last non-null value seen in the batch for that group and overwrite the column (latest-wins). Null/omitted = leave existing value untouched.
- Response stays `{ success, processed, skipped_duplicates, groups }` and adds `metrics_updated` count.

### 3. Frontend / codebase references
- Search and replace `accounts_revenue` → `accounts_data` across the codebase (admin dashboard queries, hooks, types).
- Search and replace any client invocations of `ingest-account-revenue` → `ingest-account-data` (if any exist in the frontend).
- Supabase types regenerate automatically after the migration.

### Out of scope
- No new admin UI for displaying followers / subscribers / oldest_chat / unread_chats / mass_dms — only the ingest path and storage.
