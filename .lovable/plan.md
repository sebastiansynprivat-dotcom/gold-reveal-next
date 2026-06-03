## 1. Migration: `accounts_revenue` table

Columns:
- `id uuid pk default gen_random_uuid()`
- `account_id uuid not null references accounts(id) on delete cascade`
- `date date not null`
- `platform text not null`
- `total numeric not null default 0`
- `amounts jsonb not null default '[]'::jsonb`  — array of `{purchase_id, amount}`
- `created_at`, `updated_at timestamptz` (+ `update_updated_at` trigger)
- `UNIQUE (account_id, date, platform)`
- Index on `(account_id, date desc)`

Grants:
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_revenue TO authenticated;`
- `GRANT ALL ON public.accounts_revenue TO service_role;`

Enable RLS, then policies:
- **Super admin – full access** (ALL): `has_role(auth.uid(), 'super_admin')`
- **Admins – view only** (SELECT): `is_admin()`
- **Models – view their account** (SELECT): exists in `model_users mu join accounts a on a.model_id = mu.model_id` where `mu.user_id = auth.uid() AND a.id = accounts_revenue.account_id`
- **Chatters – view assigned account** (SELECT): exists in `accounts a` where `a.id = accounts_revenue.account_id AND a.assigned_to = auth.uid()`

## 2. Edge function `ingest-account-revenue`

Path: `supabase/functions/ingest-account-revenue/index.ts`. `verify_jwt = false` in `supabase/config.toml`.

- Auth: header `x-api-key` must equal env `REVENUE_INGEST_API_KEY` (already configured).
- CORS handled (OPTIONS + headers on every response).
- Body: array (or single object) of `{ account_id: uuid, purchase_id: string, date: 'YYYY-MM-DD', platform: string, amount: number }`. Validate each.
- Service role client.
- Group incoming rows by `(account_id, date, platform)`.
- For each group:
  1. `SELECT total, amounts FROM accounts_revenue WHERE account_id=… AND date=… AND platform=…`
  2. Build a `Set` of existing `purchase_id`s. Skip incoming entries whose `purchase_id` is already in DB or earlier in the same batch.
  3. New `amounts` = existing array + new unique `{purchase_id, amount}` entries.
  4. New `total` = existing total + sum of newly added amounts.
  5. `upsert` row with `onConflict: 'account_id,date,platform'`.
- Returns `{ success: true, processed, skipped_duplicates }`.

## 3. Config

Add `[functions.ingest-account-revenue] verify_jwt = false` to `supabase/config.toml`.
