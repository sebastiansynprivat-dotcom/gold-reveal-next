# Extend ingest-account-data with time, type, customer

Add three optional string fields to each revenue entry in `supabase/functions/ingest-account-data/index.ts`. They're appended alongside `purchase_id` and `amount` inside the `accounts_data.amounts` jsonb array.

## Behavior
- `time`, `type`, `customer` are all **optional strings**.
- If present but not a string, return `400` for that row.
- Empty/whitespace-only strings are treated as missing (not stored).
- Only non-empty values are written into the amounts entry; missing ones are omitted from the object (keeps rows compact).
- Duplicate detection is unchanged — still keyed on `purchase_id` per (account, date, platform).
- Existing entries in `amounts` without these fields remain untouched.

## Code changes (single file)
`supabase/functions/ingest-account-data/index.ts`:
1. Extend `Incoming` type with optional `time?`, `type?`, `customer?`.
2. In the per-row validator, when `hasRevenue` is true, validate and trim each of the three fields; reject with `400` on wrong type.
3. When building `newEntries`, include the fields only if provided.
4. Update `ExistingRow.amounts` typing to allow the extra optional fields (jsonb tolerates it, TS just needs the shape).

No migration, no other files, no client changes.
