## Block account restore when its model is archived or purged

Enforce: an account can only be restored if its `model_id` exists in the live `models` table. If the model is archived (in `deleted_records`) or purged (gone entirely), block the restore with an actionable error.

### Change
File: `src/components/admin/DeletedRecordsTab.tsx`, function `restore`.

Inside the `row.entity_type === "account"` branch, after the existing `!payload.model_id` guard:

1. Query `models` for `id = payload.model_id` (head + count or `.maybeSingle()`).
2. If not found, check `deleted_records` for an archived model row with `entity_type = 'model'` and `original_id = payload.model_id`:
   - Archived → toast: `"Das zugehörige Model ist archiviert. Bitte zuerst das Model wiederherstellen."`
   - Not found anywhere (purged) → toast: `"Das zugehörige Model wurde endgültig gelöscht. Account kann nicht wiederhergestellt werden."`
3. Return without inserting.

### Out of scope
- Model restore flow (already cascade-restores its children).
- Purge flow.
- DB-level constraint (the `accounts.model_id` NOT NULL + FK already prevents bad inserts; this guard just produces a friendly message before the DB rejects it).