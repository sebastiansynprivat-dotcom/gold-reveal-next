## Modify `verify-telegram-id` edge function

Extend the function to return assigned accounts for a Telegram ID.

### New response shape
```json
{
  "exists": true,
  "telegram_id": "<normalized>",
  "models": [
    { "username": "...", "platform": "...", "email": "..." }
  ]
}
```
Not found → `{ "exists": false, "telegram_id": "<input>", "models": [] }`.

### Logic
1. Auth (`x-api-key` vs `CHAT_AI_TOOL`) — unchanged.
2. Validate `telegram_id` (non-empty string, trim, strip leading `@`).
3. Look up profile via `ilike` on `telegram_id` (case + `@`-tolerant). Select `id, user_id`.
4. If no profile → return `exists:false` with empty `models`.
5. Fetch open assignments from `account_assignments` where `unassigned_at IS NULL` AND (`user_id = profile.user_id` OR `profile_id = profile.id`). Also include `accounts.assigned_to = profile.user_id` for parity with `accounts-with-chatters`. Dedupe account IDs.
6. Fetch `username, platform, account_email` from `accounts` for those IDs.
7. Return `models` as `[{ username, platform, email: account_email }]`, deduped.

### Files
- `supabase/functions/verify-telegram-id/index.ts` — only file touched. No DB or config changes.

### Verification
- `supabase--curl_edge_functions` with a known Telegram ID to confirm shape and account list.
