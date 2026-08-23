# AdmireMe as fourth payout platform

Add AdmireMe to the payout/billing pipeline so it behaves exactly like 4Based, Maloum and Brezzels: fetched from the external revenue backend, stored per model/month, shown as its own tile, manually overridable, and included in billing totals.

## What changes for you

- Payout fetch (single model and bulk group fetch) now also returns an AdmireMe amount.
- The model payout view shows a fourth AdmireMe tile with its own share/earnings line and a "Manuell überschreiben" field.
- Monthly total, provider invoice / credit note amounts and billing snapshots include AdmireMe.
- Model's own dashboard (Einnahmen & Anteil) includes AdmireMe in its breakdown and totals.

## Technical details

Database (migration):
- `payout_revenue`: add `admireme_revenue numeric NULL DEFAULT 0` (nullable, like the other three after the earlier NOT NULL drop).
- No RLS/grant changes needed (existing table).

Edge function `fetch-model-revenue`:
- Read `result.admireme_revenue` (null-safe, same pattern as brezzels).
- Include it in `monthly_revenue` sum and in the upsert row.

Frontend:
- `src/components/ModelDashboardTab.tsx`
  - Add `admireme_revenue` to every `payout_revenue` select and to the row/state types.
  - `platformRevenues` shape gains `admireme`; `platformFieldMap` gains `Admireme: "admireme_revenue"`.
  - Manual override handler: include `admireme_revenue` in read/write and in the `monthly_revenue` sum.
  - Billing snapshot / invoice amount computation includes the AdmireMe row.
- `src/components/ModelGroupsPanel.tsx`: select and map `admireme_revenue` (`am`), include it in bulk-fetch result display, "Nur Fehler" detection and totals.
- `src/components/ModelHomeDashboard.tsx`: select `admireme_revenue`, apply the AdmireMe share percentage, include in breakdown rows and totals.
- `src/components/ChatterDashboardTab.tsx`: pass through `admireme_revenue` where the other three are mapped (default 0).
- Reuse the existing AdmireMe color `#ec4899` and pink badge style already defined.

Note: this relies on the external backend returning `admireme_revenue` in `/getmonthlyrevenue`. If it returns nothing, the tile shows `–`/0 until the backend adds it; our own `accounts_data` values are not used as a fallback.
