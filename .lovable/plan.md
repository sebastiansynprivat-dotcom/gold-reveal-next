## Deduplicate `bot_notifications`

The table currently piles up repeated rows (e.g. "Error logging in: …" for the same account/platform many times in a row). Goal: only one row per unique notification — newer entries replace older ones.

### Dedup key
`(account_email, platform, type, message)` — covers the LOGIN-error spam you're seeing now and any future repeats. `account_id` is intentionally excluded from the key because it can be `null`; `account_email` + `platform` already identifies the account.

### 1. Migration

- Cleanup existing duplicates: keep the most recent row (by `created_at desc`) per `(account_email, platform, type, message)`, delete the rest.
- Add unique constraint `bot_notifications_dedup_key` on `(account_email, platform, type, message)`.
- (Indexes already cover sorting; no extra index needed — the unique constraint itself is indexed.)

### 2. Edge function `ingest-bot-notifications`

Switch the bulk insert to an upsert:

```ts
admin.from("bot_notifications")
  .upsert(clean, {
    onConflict: "account_email,platform,type,message",
    ignoreDuplicates: false, // replace → bumps date + created_at
  })
```

Effect: a repeat ingest of the same `(account_email, platform, type, message)` overwrites the previous row's `date` / `created_at`, so the bell shows the latest occurrence instead of stacking duplicates.

### 3. Frontend

No changes — the list already orders by `date` then `created_at` desc and realtime UPDATE events are already handled in `SetupNotificationsBell.tsx`, so refreshed timestamps move the row to the top automatically.

### Files
- `supabase/migrations/<ts>_bot_notifications_dedup.sql`
- `supabase/functions/ingest-bot-notifications/index.ts`
