## New edge function: `controlling-chats`

Copy of `content-hub-uploads` adapted to resolve a chatter (by telegram_id) into their currently assigned accounts and return encrypted credential tokens per account.

### Auth & secrets

- Header `x-api-key` must equal `CONTROLLING_CHATS_AUTH`.
- AES-256-GCM key read from `CONTROLLING_CHATS_AES_KEY` (accepts hex-64 or base64 32 bytes, same parser as `content-hub-uploads`).
- Both secrets requested via `add_secret` before deploy.
- `supabase/config.toml` gains `[functions.controlling-chats] verify_jwt = false`.

### Request

- `POST` (also accept `OPTIONS` for CORS).
- Body: `{ "telegram_id": "..." }` — string, trimmed, leading `@` stripped. 400 if missing/empty.

### Resolution logic

1. Look up `profiles` row by normalized `telegram_id` (case-insensitive, `pre_create` allowed). If not found → `{ telegram_id, tokens: [] }`.
2. Fetch open `account_assignments` (`end_date IS NULL`) matching `user_id` or `profile_id`.
3. Load referenced `accounts` (`id, platform, username, account_email, account_password`).
4. For each account, encrypt `"<email>|++|<password>"` with AES-GCM using a fresh 12-byte IV; token = base64(iv ‖ ciphertext) — identical crypto scheme to `content-hub-uploads`.

### Response

```json
{
  "telegram_id": "maxm",
  "tokens": [
    { "platform": "maloum", "username": "modelA", "token": "<base64>" },
    { "platform": "brezzels", "username": "modelX", "token": "<base64>" }
  ]
}
```

- `username` falls back to `account_email` when empty.
- Errors returned as `{ "error": "..." }` with 400 / 401 / 405 / 500.

### Files

- New: `supabase/functions/controlling-chats/index.ts`
- Update: `supabase/config.toml`
- New secrets: `CONTROLLING_CHATS_AUTH`, `CONTROLLING_CHATS_AES_KEY` (requested with `add_secret`; user provides both values).

No DB migration, no client changes.
