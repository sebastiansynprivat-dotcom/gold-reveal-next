## Goal

Add a "Umsatz abrufen" card inside `ModelDashboardTab` → section "Einnahmen & Anteil" (above the per-account revenue list). Admin picks month + year, clicks the button, an edge function calls the external backend, and the response populates `model_dashboard` (one row per model, keyed by `model_id`).

## 1. Database migration

Schema change for `public.model_dashboard`:

- Add new column `model_id uuid` (nullable initially).
- Add `last_fetched_at timestamptz`, `last_fetched_month smallint`, `last_fetched_year smallint`.
- Backfill `model_id` from `accounts.model_id` using `account_id`.
- Collapse to one row per model: for every model, aggregate existing rows (sum `fourbased_revenue`, `maloum_revenue`, `brezzels_revenue`; max of submitted/done booleans; latest `updated_at` for `monthly_revenue`, `yesterday_revenue`, `notes`, `revenue_percentage`, `crypto_address`, `contract_file_path`, `currency`); delete the rest.
- Drop column `account_id`.
- Make `model_id` `NOT NULL` and add `UNIQUE (model_id)`.
- Update RLS policies that reference `account_id`:
  - "Models can view own model_dashboard" → match `model_users.model_id = model_dashboard.model_id`.
  - Admin policy stays as `is_admin()`.

No new table is created, so no GRANT block needed.

## 2. Edge function: `fetch-model-revenue`

New Supabase edge function (admin-only, JWT verified in code via `getClaims` + `is_admin` check).

Why an edge function: hides the `X-API-KEY` secret, avoids browser CORS to the ngrok host, performs the upsert with service role.

- Input from client: `{ model_id, month, year }`.
- Server loads the model (id, name) and its accounts (id, platform, account_email, account_password) using the service role.
- POSTs to `${REVENUE_BACKEND_URL}/getmonthlyrevenue` with:
  - Headers: `X-API-KEY: ${REVENUE_BACKEND_TOKEN}`, `Content-Type: application/json`.
  - Body:
    ```json
    {
      "month": 11,
      "year": 2026,
      "model": { "id": "...", "name": "..." },
      "accounts": [
        { "id": "...", "platform": "maloum", "email": "...", "password": "..." }
      ]
    }
    ```
- Expected response: `{ model_id, date: "dd-mm-yyyy", fourbased_revenue, maloum_revenue, brezzels_revenue, ... }` (extra `*_revenue` fields are upserted dynamically when their column exists in `model_dashboard`).
- Upserts `model_dashboard` on `model_id`: sets `fourbased_revenue`, `maloum_revenue`, `brezzels_revenue`, `monthly_revenue = fb+ml+br`, stamps `last_fetched_at/month/year`.
- Returns the saved row.

Secrets to add (via `add_secret`):
- `REVENUE_BACKEND_URL` — base URL (e.g. `https://api.shexadmin.ngrok.pro`).
- `REVENUE_BACKEND_TOKEN` — value sent in the `X-API-KEY` header.

`supabase/config.toml`: add `[functions.fetch-model-revenue]` block with `verify_jwt = false` (we validate manually in code, matching the project pattern).

## 3. Frontend — `src/components/ModelDashboardTab.tsx`

New card above the per-account list in section "Einnahmen & Anteil":

- Month `<Select>` (1–12, German labels) and Year `<Select>` (current year ± 2), defaults to today's month/year.
- Gold gradient "Umsatz abrufen" button with loading spinner.
- If `last_fetched_month`/`last_fetched_year` already match the selection, show a confirm `AlertDialog` ("Werte überschreiben?") before fetching.
- On success: toast, refresh `dashboardRevenues` / `platformRevenues`, show "Zuletzt geholt: dd.mm.yyyy HH:mm".

Data layer updates in the same file:

- `loadModelAccounts(modelId)` queries `model_dashboard` with `.eq("model_id", modelId).maybeSingle()` and maps the single row's per-platform fields onto each account by `acc.platform`.
- The existing inline per-platform `<Input>` (around lines 1512–1551) now upserts on `model_id = selectedModelId` (single row), writing only the field for that account's platform plus a recomputed `monthly_revenue`.

## 4. Files touched

- New migration (schema collapse + RLS update).
- New `supabase/functions/fetch-model-revenue/index.ts`.
- `supabase/config.toml` — add function block.
- `src/components/ModelDashboardTab.tsx` — new card + updated read/write logic.
- New memory file `mem://features/model-revenue-fetch` + index entry.

## Execution order

1. Request the two secrets (`REVENUE_BACKEND_URL`, `REVENUE_BACKEND_TOKEN`).
2. Run the migration.
3. Create the edge function + config.toml entry.
4. Update `ModelDashboardTab.tsx`.
5. Save memory + verify build.
