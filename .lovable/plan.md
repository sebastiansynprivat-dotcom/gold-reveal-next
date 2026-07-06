# Content Hub Uploads Edge Function

Create a new edge function `content-hub-uploads` that returns AES-256-GCM encrypted credentials for all accounts belonging to a given model.

## Secrets (you'll add via the secure form)
- `CONTENT_HUB_AUTH` — shared secret sent by the caller in the `x-api-key` header.
- `CONTENT_HUB_AES_KEY` — 32-byte AES key, provided as hex (64 chars) or base64.

## Endpoint
- Path: `/content-hub-uploads`
- Method: `POST`
- `verify_jwt = false` (auth is the shared secret)
- Header: `x-api-key: <CONTENT_HUB_AUTH>`
- Body: `{ "model_id": "<uuid>" }`

## Behavior
1. Validate `x-api-key` against `CONTENT_HUB_AUTH` → 401 on mismatch.
2. Validate `model_id` (uuid) via zod → 400 on failure.
3. Query `accounts` (service role) where `model_id = :model_id`, selecting `platform, account_email, account_password`.
4. For each account: build plaintext `"<account_email>|++|<account_password>"`, encrypt with AES-256-GCM using a fresh 12-byte IV; output is base64(`iv || ciphertext || authTag`) (Web Crypto returns ciphertext with the 16-byte tag appended, so the final blob is `iv(12) || ciphertext+tag`).
5. Group by platform into arrays.
6. Respond:
   ```json
   {
     "model_id": "...",
     "count": 3,
     "accounts": {
       "onlyfans": ["<b64>", "<b64>"],
       "fansly":   ["<b64>"]
     }
   }
   ```

## Decryption reference (for your consumer)
- Key: raw 32 bytes from `CONTENT_HUB_AES_KEY` (hex or base64).
- Split blob: `iv = bytes[0..12]`, `rest = bytes[12..]` → AES-256-GCM decrypt with 128-bit tag.
- UTF-8 decode → split on `|++|` → `[email, password]`.

## Files
- `supabase/functions/content-hub-uploads/index.ts` — implementation (CORS, zod input validation, key parsing helper, Web Crypto AES-GCM, service-role Supabase client).
- `supabase/config.toml` — add `[functions.content-hub-uploads] verify_jwt = false`.

## After plan approval
1. Request the two secrets via `add_secret` (`CONTENT_HUB_AUTH`, `CONTENT_HUB_AES_KEY`).
2. Create the function + config entry.
3. Deploy and smoke-test with `curl_edge_functions` using a real `model_id` (encrypted output only; no plaintext logged).
