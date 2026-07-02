## Goal
Track per-platform presence state for each chatter on `profiles.presence` (JSONB), updated via a new edge function.

## Schema
Migration on `public.profiles`:
- Add `presence jsonb NOT NULL DEFAULT '{}'::jsonb`

No RLS changes needed (existing profile policies cover it). Edge function uses service role, so client visibility is unchanged.

## Edge Function: `update-chatter-presence`

**Auth:** `x-api-key` header compared (timing-safe) against `CHAT_AI_TOOL` secret — matches `verify-telegram-id` pattern.

**Request body:**
```json
{
  "telegram_id": "@handle",
  "platform": "maloum",
  "username": "…",
  "email": "…",
  "state": "online",
  "message": "…"
}
```

**Validation:**
- `telegram_id` (required, non-empty string)
- `platform` (required, non-empty string; used as JSONB key)
- `username`, `email`, `state`, `message` optional strings

**Logic:**
1. Normalize `telegram_id` (trim, strip leading `@`, lowercase).
2. Find profile via `ilike` on normalized telegram_id (same match logic as `verify-telegram-id`), first match wins.
3. If not found → `404 {exists:false}`.
4. Build entry:
   ```json
   {
     "username": ...,
     "email": ...,
     "state": ...,
     "message": ...,
     "updated_at": "<ISO now>"
   }
   ```
   Only include provided fields (undefined skipped).
5. Merge into existing `presence` JSONB: `presence[platform] = entry` (server-side read-modify-write to preserve other platforms).
6. Update row, return `{ ok: true, profile_id, platform, entry }`.

**CORS + config:**
- Standard CORS block (allow `x-api-key`, `content-type`, `authorization`, `apikey`).
- Handle `OPTIONS`.
- Add `[functions.update-chatter-presence] verify_jwt = false` in `supabase/config.toml`.

## Files touched
- Migration: add `presence` column.
- New: `supabase/functions/update-chatter-presence/index.ts`
- Edit: `supabase/config.toml`

## Out of scope
- No UI changes.
- No consumer/reader code — just storage + ingest endpoint.