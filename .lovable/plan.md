# Offboarding section in the admin menu

Add a new "Offboarding" entry to the admin sidebar (next to "Model-Dashboard") that lists every entry from the offboarding table.

## What you get

- **List of all offboardings**, including finished ones: model name, platform, account username, target date, status badge (geplant / läuft / erledigt / fehlgeschlagen), countdown or archive date, and how many statements have been saved.
- **Search**: by model name, account username/email or platform.
- **Filters**: status (all / open / done / failed), platform, and a sort toggle (target date soonest / newest created).
- **Click an item** to expand it and see:
  - all saved payout statements (period, amount + currency, pending flag) with a download button each (same file naming as today)
  - created by (admin name) and created date, last run time, last error if there is one
  - the assigned chatter, if any (with the same "chatter still assigned" warning when under 3 days remain)
  - button to open the model card, and "Abbrechen" for entries that are not done
- Works for finished/archived accounts too, since account details are loaded from the archive when the live account no longer exists.

## Technical notes

- New `src/components/admin/OffboardingTab.tsx`; register a `offboarding` tab in the sidebar list and render it in `AdminDashboard.tsx`. Visible to the same admins who can already see offboardings (existing `is_admin()` rules), no database changes.
- Data: `account_offboardings` joined client-side with `models` (name), `accounts` (username/email/assigned_to) with fallback to `deleted_records` for archived accounts, `offboarding_statement_files`, `admin_profiles` (creator), `profiles` (chatter).
- Downloads reuse the signed-URL logic from `AccountOffboardingPanel` (extracted to a shared helper).
