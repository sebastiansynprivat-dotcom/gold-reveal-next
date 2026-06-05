## Goal
Make the Earnings hero ("TOTAL REVENUE · This month") and the per-platform values inside that section pull live revenue from `accounts_data.total`, summed per `account_id` within the selected period pill (Today / Yesterday / 7d / 30d / Last month / This month).

## Where
`src/components/ModelDashboardTab.tsx` — the `Einnahmen` Section (currently sources `dashboardRevenues` from `model_dashboard.fourbased_revenue / maloum_revenue / brezzels_revenue`).

## Changes

1. **New loader: `loadAccountsDataRevenue(modelAccountIds, period)`**
   - Compute date range for `revenuePeriod`:
     - today → today
     - yesterday → yesterday
     - 7d → last 7 days (incl. today)
     - 30d → last 30 days
     - last_month → 1st–last day of previous month
     - this_month → 1st of current month → today
   - Query: `accounts_data` select `account_id, total` where `account_id in (...)` and `date between from and to`.
   - Aggregate: sum `total` per `account_id` → `Record<accountId, number>`.
   - Set into `dashboardRevenues` (replaces the model_dashboard-derived values).
   - `platformRevenues` keeps its current shape (used elsewhere); fill it from the same per-account sums mapped to that account's platform bucket.

2. **Trigger**
   - Call the new loader whenever `selectedModelId`, `modelAccounts`, or `revenuePeriod` changes.
   - Remove (or keep but ignore for display) the `model_dashboard` revenue mapping that currently sets `dashboardRevenues` in `loadModelAccounts`. Still load `model_dashboard` for `last_fetched_at` info.

3. **Display**
   - `totalRevenue` useMemo already sums `dashboardRevenues` → automatically becomes accounts_data total once the source changes. No change needed.
   - Per-platform card amount (`rev`) likewise reflects the period sum.

4. **Editable input behavior**
   - The inline "Umsatz eintragen…" input still writes to `model_dashboard` (unchanged) — that table stays the manual-entry store. Out of scope for this change.

## Technical notes
- Use a single batched query with `.in("account_id", ids)`.
- Dates compared as ISO `YYYY-MM-DD` (column is `date`).
- Guard against empty `modelAccounts` (skip query).
- Currency conversion via existing `convertToBase` / `getSourceCurrency` already wraps the sum, so multi-currency models keep working.

## Out of scope
- The inline save-to-`model_dashboard` flow.
- The "Anteil berechnen" / payout_revenue logic.
- Other Earnings sections outside the circled hero + platform list.
