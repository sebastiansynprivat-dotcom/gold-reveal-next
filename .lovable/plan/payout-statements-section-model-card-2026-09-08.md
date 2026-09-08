# Payout Statements section (Model card)

Add a new block directly under "Umsatz abrufen" in the model card that pulls payout statements from the same external backend and lets you download each PDF/file. Nothing is stored — the links expire quickly, so they are shown live only.

## What you get

- A section "Auszahlungsbelege" under the revenue block, with two modes:
  - **Einzelner Monat** (month + year dropdowns, prefilled with the same month as the revenue fetch)
  - **Zeitraum** (from-month/year to to-month/year)
- A "Belege abrufen" button that queries the backend for the selected model's accounts.
- Result list grouped by platform, each row showing: platform badge, period (e.g. 08/2026 with begin–end dates), amount in its currency, a "Ausstehend" badge when `pending` is true, and reference/ID.
- Per-row "Herunterladen" button that opens `downloadUrl` in a new tab (uses `inline` to decide open vs. download attribute). Rows with `unavailable` set show the reason instead of a button.
- A small note showing when the links expire (`expiresAt`), plus an "Erneut abrufen" button once expired.
- Errors from the backend are surfaced per platform in a toast, same pattern as revenue fetch.

## Technical notes

New edge function `supabase/functions/fetch-payout-statements/index.ts`, modelled on `fetch-model-revenue`:

- Auth: Bearer JWT → `getClaims`, then require `admin | super_admin | sub_admin` via `user_roles` (service client).
- Input validation: `model_id` required; either (`month` 1–12 + `year`) or (`from`, `to` as `YYYY-MM`). Reject mixed/invalid input with 400.
- Loads model (`id, name`) and its accounts (`id, platform, account_email, account_password`) with the service client.
- POSTs to `${REVENUE_BACKEND_URL}/getpayoutstatements` with `X-API-KEY: REVENUE_BACKEND_TOKEN` and body `{ model: {id,name}, accounts: [...], month, year }` or `{ ..., from, to }`.
- Returns `{ ok: true, statements: [...], errors: [...] }` verbatim (normalising a bare array response into `statements`). No DB writes, no caching.
- `verify_jwt = false` (validated in code), consistent with existing functions.

Frontend in `src/components/ModelDashboardTab.tsx`:

- Local state only: `stmtMode`, `stmtMonth/Year`, `stmtFrom/To`, `stmtLoading`, `stmtRows`, `stmtFetchedAt`.
- Invoke via `supabase.functions.invoke("fetch-payout-statements", ...)`; reuse existing currency formatting helpers and the accent/glass card styling of the revenue block.
