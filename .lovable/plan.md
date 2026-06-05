## Extend `update-account` to upsert metrics into `accounts_data`

Add a new payload shape to the existing `update-account` edge function so it can write daily metrics into `accounts_data` alongside its current accounts-table updates. Existing shapes (legacy `{platform, account_email, updates}` and batch `[{account_id, updates...}]`) stay untouched.

### New accepted payload

Single object or array of:
```
{
  account_id: uuid,
  date: "YYYY-MM-DD",
  oldest_chat?: int,
  unread_chats?: int,
  mass_dms?: int
}
```

A row is treated as a "metrics row" when it contains `date` plus at least one of `oldest_chat`, `unread_chats`, `mass_dms`. Mixed batches (some metrics rows, some accounts-update rows) are supported — each item is dispatched by shape.

### Logic

1. Validate `account_id` (UUID) and `date` (`YYYY-MM-DD`); each metric, if present, must be an integer.
2. Look up the account once to get its `platform` (required by `accounts_data` unique key `account_id+date+platform`). If the account doesn't exist, return `{error: "Account not found"}` for that item.
3. Upsert into `accounts_data` keyed on `(account_id, date, platform)`:
   - Only the provided metric fields are written (latest-wins overwrite).
   - `total` / `amounts` are left untouched on existing rows; new rows get `total=0`, `amounts=[]`.
4. Response includes per-item result with `account_id`, `date`, `metrics_updated: true/false`, and any error.

### Auth & conventions

- Keeps existing `x-api-key` check against `ACCOUNTS_SECRET_KEY`.
- Uses the same service-role client already created in the function.
- No changes to `config.toml`, `ingest-account-data`, the database schema, or any frontend code.

### Files

- `supabase/functions/update-account/index.ts` — add detection + handler for the new metrics shape.
