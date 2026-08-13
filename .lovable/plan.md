# Model Profile Lookup Endpoint

A new backend function `model-profile-lookup` that takes a platform + account email and returns the approved model profile snapshot.

## Behaviour

Request (POST, JSON): `{ "platform": "...", "email": "..." }`

- Auth via secret `chat_ai_model_profiles`, accepted as `x-api-key` or `Authorization: Bearer`. Wrong/missing → 401.
- Invalid body (missing platform or email) → 400.
- Matching is case-insensitive on both platform and email; email is trimmed/lowercased.

Responses:

- Approved profile found → 200
```text
{ "model_id", "profile_status": "approved", "confirmed_at", "updated_at", "profile": <approved_snapshot> }
```
- No account matches → 404 `{ "code": "not_found" }`
- More than one account matches platform+email → 409 `{ "code": "ambiguous_account" }`
- Account found but no linked model → 200 `{ "model_id": null, "profile_status": "missing", "profile": null }`
- Model linked but no profile row, not confirmed, or `approved_snapshot` empty → 200 `{ "model_id": "<id>", "profile_status": "missing", "confirmed_at": null, "updated_at": null, "profile": null }`

## Technical notes

- New file `supabase/functions/model-profile-lookup/index.ts`, Deno + service-role client, CORS headers on all responses, zod body validation.
- Account resolution: `accounts` filtered by `ilike` on `account_email` and `platform`; count results to detect ambiguity.
- Profile read: `model_profiles` by `model_id`, selecting `confirmed_at`, `updated_at`, `approved_snapshot`. Approved requires both `confirmed_at` and a non-empty `approved_snapshot`; no fallback to the live draft row.
- Register `[functions.model-profile-lookup] verify_jwt = false` in `supabase/config.toml` (secret check happens in code).
- The secret `chat_ai_model_profiles` must be added before the function will answer; I'll request it during implementation.
