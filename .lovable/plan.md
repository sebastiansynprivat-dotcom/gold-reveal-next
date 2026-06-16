## Goal
Exclude chatters whose Start Date is after the selected report date from the Chatter Reports view, platform tab counts, table, and downloaded XLSX/CSV.

## Change
In `src/components/admin/ChatterReportsTab.tsx`:

1. Add a date-aware filter applied before all consumers of `rows`:
   - A chatter is included only if `start_date` is null/empty OR `start_date <= selectedDate`.
   - Comparison uses ISO `yyyy-MM-dd` strings to avoid timezone drift.

2. Apply this filter:
   - To the `platformList` derivation (so empty platforms don't show inflated counts).
   - To the per-tab `count` shown next to each platform pill (line ~506).
   - To the `filtered` memo that feeds the table and `buildReport()` (used by both XLSX and CSV downloads — no separate changes needed there).

## Notes
- Pure presentation-layer filter; no DB, RLS, or schema changes.
- Chatters with no `start_date` remain visible (current behavior preserved).
- Switching the date picker to an earlier day will immediately shrink the list and tab counts; switching back restores them.
