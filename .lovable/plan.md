## New Edge Function: `verify-telegram-id`

Public edge function that checks if a given Telegram ID exists in the `profiles` table. Auth is gated by a shared secret header.

### Behavior
- **Method:** `POST` (plus `OPTIONS` for CORS)
- **Auth:** Request must include header `x-api-key: <CHAT_AI_TOOL>` matching the `CHAT_AI_TOOL` secret. Mismatch → `401`.
- **Input:** JSON body `{ "telegram_id": "<string>" }` (validated with Zod; non-empty string, trimmed).
- **Logic:** Use service-role Supabase client to `select id from profiles where telegram_id = $1 limit 1`.
- **Output:** `{ "exists": true | false }` with `200`. Errors return `{ error }` with proper status.
- **Config:** `verify_jwt = false` in `supabase/config.toml` (since auth is via custom header).

### Secret
- `CHAT_AI_TOOL` — request via `add_secret` tool; user will paste the value.

### Files
- `supabase/functions/verify-telegram-id/index.ts` (new)
- `supabase/config.toml` (append `[functions.verify-telegram-id] verify_jwt = false`)

No database changes.
