# Delete accounts_data entries for the 8 archived 4Based accounts

## What was found

The 8 archived accounts (amateurshe, belen, jateen, lysa, magic-mia, marketkaaaof, mayasinn, spicyvictoria) have **21 rows** in `accounts_data` (some accounts have multiple rows — daily snapshots from the ingest job).

## Revenue table trace (requested)

- **payout_revenue**: keyed by `model_id`. Zero rows exist for the 8 affected models — nothing to delete.
- **daily_revenue**: keyed by chatter `user_id`, not by account. None of the 8 accounts ever had a chatter assigned (`assigned_to` was NULL), so no chatter revenue rows can belong to them — nothing to delete.

So the only leftover data is in `accounts_data`.

## Important consequence

The model dashboard's "Earnings" view reads from `accounts_data`. Deleting these rows means the earnings history of these 8 accounts will no longer appear in the respective model dashboards.

## What happens

1. Delete all 21 `accounts_data` rows whose `account_id` is one of the 8 archived account IDs:
   `2700eeb8…, 558aa216…, 422ce00c…, e7ee9ad6…, 852c6116…, 970bceb0…, 58ef46ea…, 13c6c9dc…`
2. Verify afterwards that zero rows remain for these account IDs.

## Technical notes

- One data change via run_sql: `DELETE FROM public.accounts_data WHERE account_id IN (the 8 ids)` — scoped to exact IDs, no wildcard.
- No schema, RLS, or code changes. The archived account copies in `deleted_records` remain intact, so the accounts can still be traced.
