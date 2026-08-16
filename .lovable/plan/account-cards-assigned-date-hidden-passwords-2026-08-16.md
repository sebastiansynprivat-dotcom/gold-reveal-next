# Account cards: assigned date + hidden passwords

## 1. Show the assignment date
In the admin chatter account cards (Brezzels / brezzels.com header area), display when this account was assigned to this chatter.

- The date already exists: `account_assignments.start_date` per user + account. `AccountStatsRows` already loads those rows.
- Use the most recent active assignment window's `start_date` (accounts can be re-assigned), formatted as `dd.MM.yyyy`.
- Render it as a small muted line in the account header, next to/below the domain link, e.g. `Zugewiesen 12.08.2026`. If no date exists, show nothing.

## 2. Hide passwords by default
- Password field renders masked (`••••••••`) by default.
- Add a small eye toggle per account to reveal it; state is per-card and resets on remount (not persisted).
- Clicking the password field keeps copying the real password to the clipboard, masked or not.
- Apply the same masking to the other account credential lists in the admin dashboard (chatter detail card, model/pool credential rows) so passwords are never visible without an explicit reveal.

## Technical notes
- `src/components/admin/AccountStatsRows.tsx`: derive `assignedDate` from the already-fetched assignments and expose it (via a new optional `onAssignedDate` callback or a rendered header line — implement by lifting the date into the card header prop).
- `src/pages/AdminDashboard.tsx` (~lines 6594-6655, ~8944, ~10886): add `revealed` state keyed by account id, mask password text, add toggle button.
- No database or backend changes.
