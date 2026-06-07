## Goal
Earnings totals in **ModelDashboardTab** should include revenue from accounts that have been archived (deleted) for the selected model. Going forward only — past archived data is unrecoverable because the current `ON DELETE CASCADE` already wiped it.

## Changes

### 1. Database migration
- Drop the cascade on `accounts_data.account_id → accounts.id` and replace it with `ON DELETE SET NULL` (or `NO ACTION`). The `accounts_data` rows survive the account deletion and stay queryable by their original `account_id` value.
- Snapshot the link to the model directly on `accounts_data` so we can find historical rows even after the account row is gone:
  - Add column `model_id uuid` (nullable, no FK or `ON DELETE SET NULL` to `models`).
  - Backfill from `accounts.model_id` for existing rows.
  - Add a `BEFORE INSERT` trigger that sets `NEW.model_id` from `accounts.model_id` if null.
- Keep the existing `archive_deleted_record` trigger on `accounts` — the deleted account row is still archived to `deleted_records` as today.

### 2. ModelDashboardTab earnings query
In the "period revenue from `accounts_data.total`" effect:
- Continue to seed `accountIds` from `modelAccounts` (active accounts).
- Additionally pull archived account ids for the selected model from `deleted_records` (`entity_type = 'account'`, `data->>'model_id' = selectedModelId`) and union them into `accountIds`.
- Query `accounts_data` by that combined id list as today, but also fall back to `model_id = selectedModelId` so rows whose account_id was nulled still sum in.
- Per-platform breakdown (`platformRevenues`): for archived ids, read the platform from the archived snapshot (`deleted_records.data->>'platform'`) since `modelAccounts` no longer contains them.

No UI/visual changes — totals just become inclusive of archived accounts.

## Out of scope
- Backfilling lost history for accounts that were already archived before this migration.
- Showing archived accounts as rows in the dashboard list (only their revenue is folded into the totals).
