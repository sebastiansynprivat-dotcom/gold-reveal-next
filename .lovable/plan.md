## Add child-account preview to model restore confirmation

When an admin clicks "Restore" on an archived model in `DeletedRecordsTab`, replace the generic confirm with a count-aware confirm that shows how many archived accounts will be cascade-restored.

### Change
File: `src/components/admin/DeletedRecordsTab.tsx`, function `restore` (lines 62–115).

Before the existing `confirm(...)` call, when `row.entity_type === "model"`:
1. Query `deleted_records` for `entity_type = 'account'`, `restored_at is null`, `data->>model_id = row.original_id`, using `select("id", { count: "exact", head: true })`.
2. Build the confirm message:
   - 0 children → `Model "<name>" wiederherstellen?`
   - N children → `Model "<name>" wiederherstellen?\n\nDazu werden N archivierte Account(s) automatisch mit-wiederhergestellt.`
3. For non-model rows, keep the current confirm text unchanged.

No other logic changes — the existing cascade-restore loop already handles the actual restoration. Failure of the count query falls back to the generic confirm (non-blocking).

### Out of scope
- No DB/schema changes.
- No change to archive flow, purge flow, or account-only restore.
- No UI redesign of the table.