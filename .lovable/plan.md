# Fix: Orphan accounts + enforce model_id

## Root cause
`src/components/ModelDashboardTab.tsx` `deleteModel` (~line 1599) sets `accounts.model_id = NULL` BEFORE deleting the model, so the `cascade_delete_model_accounts` trigger finds nothing and the accounts are left orphaned.

## Plan

### Step 1 — Recover `model_id` from `accounts_data` (primary source of truth)
```sql
UPDATE accounts a
   SET model_id = sub.model_id
  FROM (
    SELECT DISTINCT ON (account_id) account_id, model_id
      FROM accounts_data
     WHERE model_id IS NOT NULL
     ORDER BY account_id, date DESC
  ) sub
 WHERE a.model_id IS NULL AND a.id = sub.account_id;
```
Recovers ~11/26, including the 2 still-active `dreameafterdark` accounts (re-linked, not archived).

### Step 2 — Regex/normalized-name fallback for remaining 15
For each still-orphan account, normalize the email local-part (`lower`, strip non-alphanumeric) and match against the same normalization of `models.name`/`username` and `deleted_records` model name/username. Apply only when there is exactly one match — ambiguous matches are skipped.
```sql
-- pseudocode applied as a single UPDATE with a CTE
WITH norm_orphans AS (
  SELECT id, regexp_replace(lower(split_part(account_email,'@',1)),'[^a-z0-9]','','g') AS k
    FROM accounts WHERE model_id IS NULL
),
candidates AS (
  SELECT id AS model_id, regexp_replace(lower(coalesce(name,username)),'[^a-z0-9]','','g') AS k
    FROM models
  UNION ALL
  SELECT original_id, regexp_replace(lower(coalesce(data->>'name', data->>'username')),'[^a-z0-9]','','g')
    FROM deleted_records WHERE entity_type='model'
),
unique_match AS (
  SELECT o.id, max(c.model_id) AS model_id
    FROM norm_orphans o JOIN candidates c ON c.k = o.k
   GROUP BY o.id HAVING count(DISTINCT c.model_id) = 1
)
UPDATE accounts a SET model_id = u.model_id
  FROM unique_match u WHERE a.id = u.id;
```
Plus the explicit override `queniii → queeniii`.

### Step 3 — Archive remaining orphans as-is
```sql
DELETE FROM accounts WHERE model_id IS NULL;
```
The BEFORE-DELETE trigger archives them to `deleted_records`; `pre_archive_account_close_assignments` closes open assignments.

### Step 4 — Cascade-archive accounts whose recovered model is archived
```sql
DELETE FROM accounts a
 WHERE a.model_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM models m WHERE m.id = a.model_id)
   AND a.model_id IN (SELECT original_id FROM deleted_records WHERE entity_type='model');
```

### Step 5 — Verify
```sql
SELECT count(*) FROM accounts WHERE model_id IS NULL;  -- must be 0
```

### Step 6 — Fix the bug source
`src/components/ModelDashboardTab.tsx` `deleteModel`: remove the pre-delete `update({ model_id: null })` and call `.delete()` directly. The DB trigger handles cascade + archival with `model_id` preserved.

### Step 7 — Enforce NOT NULL at DB
Migration: `ALTER TABLE public.accounts ALTER COLUMN model_id SET NOT NULL;`

### Step 8 — App-layer guards
Audit account create/update paths; throw/toast: "Accounts cannot exist without a model. Please create or select a model first."
- `src/components/ModelDashboardTab.tsx` (create form)
- `src/pages/AdminDashboard.tsx` (any account UI found)
- `supabase/functions/update-account/index.ts` (400 if `model_id` missing)
- `supabase/functions/ingest-account-data/index.ts`, `accounts-with-chatters/index.ts` (verify never insert NULL)

## Files changed
- `src/components/ModelDashboardTab.tsx`
- `src/pages/AdminDashboard.tsx`
- `supabase/functions/update-account/index.ts`
- One data operation block (Steps 1–4)
- One migration (Step 7)
