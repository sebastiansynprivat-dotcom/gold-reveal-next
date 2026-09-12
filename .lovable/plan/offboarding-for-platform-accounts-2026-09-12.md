# Offboarding for platform accounts

Add an "Offboarding" block to the Plattform-Accounts section of the model card. You pick a platform account and a date; from then on the system prepares the account for shutdown and archives it on that date.

## What you get

- **Create entry**: choose one of the model's active platform accounts + a target date, then "Offboarding planen".
- **Immediate effect on creation**: posting and messaging for that account are switched off right away.
- **Live countdown card** per planned entry: platform badge, account name, target date, and a countdown (days / hours). Statuses: `geplant`, `läuft` (target date reached, work in progress), `erledigt`, `fehlgeschlagen`.
- **Stop/delete**: a "Abbrechen" button removes the entry. Posting/messaging are not switched back on automatically (they stay off unless you re-enable them in the account row).
- Completed entries are shown greyed out with the archive date and the number of saved statements, and are ignored by the daily job.

## Daily job behaviour

Runs once a day and, for every entry that is not `erledigt`:

1. Re-asserts posting and messaging off on the account.
2. Collects payout statements for **all months from the account's first revenue month up to the current month**, skipping every period already stored (no duplicates) — each saved file is recorded per entry.
3. If the target date has arrived and every reachable statement is stored, the account is archived (same path as manual deletion, so it keeps showing greyed out in the model card) and only then is the entry marked `erledigt` with a timestamp.
4. If archiving does not happen, the entry stays open and is retried the next day; the last error is stored and shown on the card.

Files are stored in a private `payout-statements` bucket under `<model_id>/<account_id>/<platform>_<period>.pdf`. Admins can download them from the offboarding card.

## Technical notes

Database:
- `public.account_offboardings`: `account_id`, `model_id`, `platform`, `target_date`, `status` (`scheduled|running|done|failed`), `archived_at`, `last_run_at`, `last_error`, `created_by`, timestamps + update trigger. Partial unique index on `account_id` where status <> 'done'. GRANTs for `authenticated` (select/insert/update/delete) and `service_role`; RLS policies via `is_admin()`.
- `public.offboarding_statement_files`: `offboarding_id`, `account_id`, `platform`, `period` (`YYYY-MM`), `storage_path`, `amount`, `currency`, `pending`, `created_at`; unique on (`account_id`, `period`) — this is the duplicate guard. GRANTs + admin-only RLS.
- Private storage bucket `payout-statements` with admin-only read policies on `storage.objects`.
- `pg_cron` job at 03:10 UTC calling the new edge function via `pg_net` (data-only SQL through run_sql, not a migration). Daily cadence, so an account is archived at most ~24h after its date — that is the trade-off versus running the database more often.

Edge function `supabase/functions/process-offboardings/index.ts` (`verify_jwt = false`, service role):
- Loads open entries (`status <> 'done'`), bounded to 25 per run, one lease-style `last_run_at` guard so overlapping runs skip entries already touched this cycle.
- Sets `post = false`, `message = false` on the account.
- Determines first revenue month from `accounts_data` for the account, builds the missing period list against `offboarding_statement_files`, then calls `${REVENUE_BACKEND_URL}/getpayoutstatements` (same contract as `fetch-payout-statements`) per missing range, streams each `downloadUrl` into the bucket and inserts a file row.
- On/after `target_date`: archives the account (delete from `public.accounts`, which the existing `archive_deleted_record` trigger writes into `deleted_records`), sets `archived_at` and `status = 'done'`. Any failure leaves the entry open with `last_error` set and `status = 'failed'`.
- Halts a run on backend auth/quota errors instead of looping.

Frontend `src/components/ModelDashboardTab.tsx`:
- New `Offboarding` sub-block inside the Plattform-Accounts section: account select (active accounts only), date picker, create/cancel handlers, countdown ticking each minute, list of entries with stored-file counts and signed-URL downloads.
