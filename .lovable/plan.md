## Goal
Fix duplicate archived accounts after restore, and cascade child-account restoration when a model is restored.

## Changes

### 1. `src/components/admin/DeletedRecordsTab.tsx` — restore handler
- After successfully inserting the snapshot back into the live table, `DELETE FROM deleted_records WHERE id = row.id` instead of just setting `restored_at`. Keeps the archive clean (no ghost duplicates).
- When the restored entity is a **model**: query `deleted_records` for `entity_type = 'account'` where `data->>'model_id'` equals the restored model id. For each, insert the snapshot back into `accounts`, then delete that archive row. Surface a toast like "Model + N accounts restored." Failures on individual children are logged and counted but don't abort the model restore.

### 2. `src/components/ModelDashboardTab.tsx` — defensive filter
- In `loadModelAccounts` (~L704) and the archived-accounts revenue aggregation (~L812), add `.is("restored_at", null)` to the `deleted_records` queries. Hides any legacy rows where `restored_at` was set but the row wasn't deleted, so no ghost archived cards appear.

## Out of scope
- No schema changes, no changes to delete/purge flow, no retroactive cleanup of existing `deleted_records` rows.
- Einnahmen continues to include revenue from genuinely archived accounts; archived cards still render grayed with disabled buttons.
