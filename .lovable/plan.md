## Update `ingest-account-data` for metrics-only payloads

The function already reads `unread_chats`, `oldest_chat`, `mass_dms`, `followers`, `subscribers` from the top level of each row and upserts by `(account_id, date, platform)`. The payload shape you described is already accepted, but a few small adjustments make it cleaner and more predictable for metrics-only ingest:

### Changes to `supabase/functions/ingest-account-data/index.ts`

1. **Accept metrics-only rows explicitly** — keep `purchase_id` + `amount` as optional. Drop the "must contain revenue OR metric" error so a pure metrics row like your example is always valid (currently it is, but the error message is misleading).
2. **Always upsert when metrics are present**, even if values are identical to what's stored (so re-sending the same snapshot still touches `updated_at`). Current code skips when `metricsChanged` is false.
3. **Preserve `total` and `amounts`** on metrics-only upserts (already done — keep as-is, just make it explicit in code comments).
4. **Log per-row metric updates** with `rid` for easier debugging.

No schema changes, no other files touched. The existing `accounts_data` unique index on `(account_id, date, platform)` handles the upsert target.

### Example payload that will work after the change

```json
[
  {
    "account_id": "…uuid…",
    "date": "2026-06-05",
    "platform": "fanvue",
    "unread_chats": 12,
    "oldest_chat": 3,
    "mass_dms": 4,
    "followers": 1820,
    "subscribers": 410
  }
]
```

Same `x-api-key: REVENUE_INGEST_API_KEY` header as today.