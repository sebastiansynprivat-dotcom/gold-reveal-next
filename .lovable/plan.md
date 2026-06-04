## Plan

### 1. Database migration (DONE if approved on previous step — already applied)
- Renamed `accounts.media_id` → `accounts.media`, type `jsonb`.

### 2. Edge function `update-account` — support BOTH payloads in parallel

Detect shape from the body:

**A. New batch shape** — body is an array, or an object containing `account_id`:
```json
[
  {
    "account_id": "881ec465-...",
    "post": true,
    "message": true,
    "main_message": "...",
    "follow_message": "...",
    "media": { "mediaId": "...", "type": "picture", "width": 960, "height": 1280 }
  }
]
```
- For each item: validate `account_id` is a UUID, pick only allowed fields (`post`, `message`, `main_message`, `follow_message`, `media`), then `update accounts where id = account_id`.
- Return `{ success, total_updated, results: [{ account_id, updated, error? }] }`.

**B. Legacy shape** — body has `platform` + `account_email` + `updates`:
- Behaviour unchanged. Still updates by `(platform, account_email)` with the existing `ALLOWED` whitelist.

### 3. Allowed-fields whitelist
Extend `ALLOWED` to also include: `post`, `message`, `main_message`, `follow_message`, `media`. Keeps legacy callers working and lets them push the new fields too.

### Technical notes
- Auth: same `x-api-key` check against `ACCOUNTS_SECRET_KEY`.
- Uses service role client (RLS bypass), as today.
- CORS unchanged.
- No client code changes required.
