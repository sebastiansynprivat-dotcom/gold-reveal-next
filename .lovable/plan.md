# Offboarding: "Alle Accounts" auswählen

Add a select-all option to the platform-account dropdown in the Offboarding block, so one date can schedule every eligible account of the model at once.

## What you get

- A new first entry in the dropdown: **"Alle Accounts (n)"**, where n is the number of active accounts that don't already have an open offboarding.
- Pick that entry plus a date, press "Offboarding planen": one offboarding entry is created per eligible account, all with the same target date.
- Posting and messaging are switched off immediately for every one of those accounts (same behaviour as the single-account case).
- Result toast names how many were scheduled, and reports any that failed instead of silently skipping them.
- The dropdown option only appears when there are at least two eligible accounts.

## Technical notes

`src/components/admin/AccountOffboardingPanel.tsx` only:

- Sentinel value `"__all__"` as a `SelectItem` above the account list, label built from `selectable.length`.
- `create()` branches: when the sentinel is chosen, build the insert payload array from `selectable` (account_id, model_id, platform, target_date, created_by) and insert in one call; then one `accounts` update with `.in("id", ids)` setting `post: false, message: false`.
- Errors surface via toast; on success reset select + date and reload the list. No schema, RLS, or edge-function changes — the existing daily job picks up the new rows unchanged.
