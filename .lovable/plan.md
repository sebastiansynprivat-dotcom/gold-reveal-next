# New edge function: `update-controlling`

Public GET endpoint returning, for every profile with a non-empty `telegram_id` (both `pre_create=true` and `false`), their currently-assigned accounts grouped by platform → account username with the most recent metrics.

## Auth

- Header `x-api-key` must equal the `CONTROLLING_DASH` secret (added via `add_secret` before deploy).
- Mismatch / missing → 401.
- Uses service role client internally.

## Response shape

```json
[
  {
    "chatter_name": "...",         // profiles.name
    "telegram_id": "...",
    "date": "11122026",            // ddmmyyyy — most recent accounts_data.date across this chatter's assigned accounts (today if none)
    "platforms": {
      "maloum": {
        "<account.username>": {
          "amounts": [...],        // accounts_data.amounts jsonb
          "total": 123.4,
          "mass_dms": 10,
          "unread_chats": 3,
          "oldest_chat": 2
        }
      },
      "brezzels": { "<username>": { ... } }
    }
  }
]
```

- Account key = `accounts.username` (fallback `account_email` if username empty). Duplicate usernames on the same platform → suffix ` #2`, ` #3`.
- Missing latest row for an assigned account → zeros / empty amounts.
- Chatters with no open assignments still returned with `platforms: {}`.

## Selection logic

1. Load `profiles` where `telegram_id` is non-null and non-empty (no `pre_create` filter).
2. Load open `account_assignments` (`end_date IS NULL`) matching those profiles by `user_id` or `profile_id`.
3. Load referenced `accounts` (id, platform, username, account_email).
4. For each account, pull the latest `accounts_data` row (single query ordered by date desc, reduced in code — keeps the max per account_id).
5. Assemble the nested JSON per chatter, using that account's latest date to compute the per-chatter `date` (max across the chatter's accounts).

## Files

- New: `supabase/functions/update-controlling/index.ts`
- Update: `supabase/config.toml` — add `[functions.update-controlling] verify_jwt = false`
- Add secret `CONTROLLING_DASH` via `add_secret` before deploy.

No DB migration, no client code, no other functions touched.
