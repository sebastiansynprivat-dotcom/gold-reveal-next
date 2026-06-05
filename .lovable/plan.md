## Bug
`loadModelAccounts` still maps `model_dashboard.{fourbased,maloum,brezzels}_revenue` into `dashboardRevenues` / `platformRevenues`. That call resolves after the new accounts_data effect and overwrites it with 0s, so the hero stays at 0,00 EUR even though `accounts_data` has rows.

## Fix
In `src/components/ModelDashboardTab.tsx`, inside `loadModelAccounts` (lines ~511–546):

- Keep loading `model_dashboard` only for `last_fetched_at / month / year` (used by the "last fetched" UI).
- **Stop** populating `revMap` / `platRevMap` from `model_dashboard`.
- Remove the trailing `setDashboardRevenues(revMap)` and `setPlatformRevenues(platRevMap)` calls — those state values are now owned exclusively by the accounts_data effect.

After this, `dashboardRevenues` is sourced solely from `accounts_data.total` for the active period, and the hero plus per-platform cards reflect real data.

## Out of scope
- Editable per-platform input still writes to `model_dashboard` (unchanged).
- "Anteil berechnen" / payout flow (unchanged).
