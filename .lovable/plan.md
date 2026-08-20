# ingest-post-reports: diagnose the 400s

## What the logs show

Every recent call to `ingest-post-reports` is a `POST` that returns **HTTP 400** (12 of 12 in the retained window, roughly one batch every ~2 minutes, retried 3x each time). No other ingest function is failing — `ingest-account-data` and `ingest-revenue` return 200.

400 in that function is only ever returned by its own input validation (auth failure would be 401, a database problem 500). So the caller's payload is being rejected. The function currently logs nothing on a validation failure, so the logs cannot tell us *which* field is wrong — that is the gap to close first.

The possible rejections, given the code, are:
- `account_id` missing or not a UUID (e.g. an account name or numeric platform id sent instead)
- `date` not in `YYYY-MM-DD` form (e.g. `20.08.2026`, or an ISO timestamp)
- `posted` / `failed` not a non-negative integer (e.g. `"3,5"`, `null` in a string field, a float)

## Plan

1. Add request-scoped logging to `supabase/functions/ingest-post-reports/index.ts`, matching the style already used in `ingest-account-data`: a short request id, the received row count, and — on any validation failure — the row index, the field name, and the offending value.
2. Make the 400 responses self-describing: include `row`, `field`, and `got` in the JSON body so the calling bot's own error output identifies the problem.
3. Accept the harmless shape variations that most likely cause this, without loosening data integrity:
   - `date` also accepted as a full ISO timestamp / `DD.MM.YYYY`, normalised to `YYYY-MM-DD`
   - `posted` / `failed` accepted as numeric strings and as `null`/absent (treated as `0`), still rejecting negatives and non-numerics
4. Redeploy, then re-read the function logs after the next incoming batch and report the exact rejected field. If it turns out to be `account_id` (a name or foreign id rather than our UUID), that is a caller-side mapping issue and I'll come back with the concrete mapping fix rather than silently guessing an account.

## Notes

No schema change is needed — `post_reports` already matches the payload (`account_id uuid`, `date date`, `posted int`, `failed int`) and the upsert conflict target is correct.
