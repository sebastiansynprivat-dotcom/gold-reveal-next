## Recap

"Archive" = existing soft-delete to `deleted_records` (real DELETE on live table, snapshotted by `archive_deleted_record`). "Delete/purge" = Trash button in `DeletedRecordsTab` that removes the archive entry permanently.

Goal: cascade archive + purge correctly across model → account → assignment / accounts_data, without losing assignment or revenue history at archive time.

---

## Archiving a model

Existing `cascade_delete_model_accounts` trigger stays (deletes child accounts → each one archives itself).

New BEFORE DELETE trigger `pre_archive_model_close_assignments` on `models`: for every child account of the model, close open `account_assignments` (`end_date IS NULL`) → set `end_date = current_date`, `unassigned_at = now()`. `account_id` is left untouched. `accounts.assigned_to` / `assigned_at` are NOT modified. `accounts_data` untouched.

## Archiving an account

New BEFORE DELETE trigger `pre_archive_account_close_assignments` on `accounts`: close open `account_assignments` for this account (same as above). `account_id` untouched. `accounts_data` untouched. `accounts.assigned_to` / `assigned_at` not modified (the account row itself is about to be archived anyway).

## Drop the three foreign keys

Required so child rows keep their archived id after the parent row is gone:
- `account_assignments_account_id_fkey` (currently `ON DELETE CASCADE`) → drop. `account_id` becomes plain `uuid`.
- `accounts_data_account_id_fkey` → drop.
- `accounts_data_model_id_fkey` → drop.

No replacement constraint. Cleanup is handled by triggers + purge RPCs.

## Purging an archived account (Trash in `DeletedRecordsTab` on an `account` row)

New SECURITY DEFINER RPC `purge_archived_account(p_original_id uuid)`, gated by `is_admin()`:
- `DELETE FROM account_assignments WHERE account_id = p_original_id;` (open + historical)
- `DELETE FROM accounts_data WHERE account_id = p_original_id;`
- Profiles untouched.
Then `DeletedRecordsTab.purge` deletes the `deleted_records` row.

## Purging an archived model (Trash on a `model` row)

New SECURITY DEFINER RPC `purge_archived_model(p_original_id uuid)`, gated by `is_admin()`:
- Find every archived account in `deleted_records` whose snapshot has `data->>'model_id' = p_original_id`.
- For each child account `original_id`: run the same two deletes (`account_assignments`, `accounts_data`) and delete the child's `deleted_records` row.
- Also `DELETE FROM accounts_data WHERE model_id = p_original_id` to catch model-level rows with no account link.
- Profiles untouched.
Then `DeletedRecordsTab.purge` deletes the model's own `deleted_records` row.

## UI changes (`DeletedRecordsTab`)

`purge(row)`:
- `entity_type === 'account'` → call `purge_archived_account(row.original_id)` then delete the archive row.
- `entity_type === 'model'` → call `purge_archived_model(row.original_id)` (it handles child archive rows too).
- `entity_type === 'profile'` → unchanged.
- Model purge confirm dialog: list how many archived child accounts + assignment rows + accounts_data rows will be wiped (pre-count via two `select count` queries).

## Restore behavior

Unchanged. Restoring an archived account re-inserts the row with its original id; because `account_id` was never modified on assignments / accounts_data, history reconnects automatically.

---

## Technical details

- All new triggers and RPCs: `SECURITY DEFINER`, `SET search_path = public`. RPCs check `is_admin()`.
- Existing `cascade_delete_model_accounts`, `archive_deleted_record`, `track_account_assignment` triggers stay.
- Trigger firing order on `models`: `a_pre_archive_model_close_assignments` BEFORE DELETE runs before `b_cascade_delete_model_accounts` (alphabetical). On `accounts`: `a_pre_archive_account_close_assignments` runs before `b_archive_deleted_record`.
- `track_account_assignment` on `accounts` UPDATE is not triggered because we don't touch `assigned_to`.
- No table-shape changes → no client type regen needed for columns; types regen will reflect the dropped FKs in relationship metadata only.

## Out of scope

- No new columns.
- No changes to `profiles` archive flow.
- No edge function changes.