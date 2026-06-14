## Goal

One-off SQL backfill of `profiles_data` from existing `account_assignments` + `accounts_data`, matching the payload shape that `ingest-profiles-data` upserts.

## Source → target mapping

For every `(telegram_id, date)` where `date` falls in `[aa.start_date, COALESCE(aa.end_date, current_date)]` and an `accounts_data` row exists for the assigned `account_id` on that `date`:

- `telegram_id` ← `profiles.telegram_id` (resolved by `aa.profile_id`, fallback `aa.user_id`)
- `date` ← `accounts_data.date`
- `revenue` ← `SUM(accounts_data.total)`
- `mass_dm` ← `SUM(COALESCE(accounts_data.mass_dms, 0))`
- `unread_chats` ← `SUM(COALESCE(accounts_data.unread_chats, 0))`
- `oldest_chat` ← `MAX(COALESCE(accounts_data.oldest_chat, 0))`
- `models` ← `jsonb_agg(DISTINCT { model_id, name, account_id, platform, total })` for that day

Rows where no `telegram_id` resolves are skipped.

## Upsert

`INSERT … ON CONFLICT (telegram_id, date) DO UPDATE` setting all five aggregate columns + `models` + `updated_at = now()`. This matches the edge function's `onConflict: "telegram_id,date"`.

## Run

Executed once via the insert tool (single SQL statement). Returns affected row count. No schema or code changes.

## Technical notes

- Joins: `account_assignments aa` → `profiles p ON p.id = aa.profile_id OR (aa.profile_id IS NULL AND p.user_id = aa.user_id)` → `accounts_data ad ON ad.account_id = aa.account_id AND ad.date BETWEEN aa.start_date AND COALESCE(aa.end_date, current_date)` → `accounts a ON a.id = ad.account_id` → `models m ON m.id = a.model_id`.
- `GROUP BY p.telegram_id, ad.date` to dedupe overlapping assignments.
- `WHERE p.telegram_id IS NOT NULL AND p.telegram_id <> ''`.
- Normalizes telegram_id with `lower(regexp_replace(p.telegram_id, '^@', ''))` only if you want it — default plan keeps the value as stored on the profile (consistent with how `ingest-profiles-data` writes it). Confirm if you want normalization.

Proceed?