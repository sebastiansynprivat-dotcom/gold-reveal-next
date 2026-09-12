# Offboarding counter in the Model-Verwaltung header

Add a small badge/button next to "Gruppen" and "Model anlegen" that shows how many accounts are currently slated for offboarding.

## Behaviour

- Shows the number of open offboardings (everything not yet archived/"erledigt"). Hidden when the count is 0.
- Styled as a compact gold outline button with a countdown-style icon and the number.
- Clicking it opens a popover/panel listing every open entry:
  - model name (username first, real name only internally as elsewhere)
  - platform + account name
  - target date and live countdown (days/hours/minutes, "Termin erreicht" once due)
  - failed entries marked in red
  - sorted by nearest target date first
- Clicking a list entry closes the panel, selects that model (opens its model card) and scrolls to the card — same behaviour as clicking a row in the model list.

## Technical notes

- New component `src/components/admin/OffboardingOverviewButton.tsx`:
  - loads `account_offboardings` where `status <> 'done'`, joined/resolved against `models` (username, name) and `accounts` (platform, username/account_email) via two lookups, ordered by `target_date`.
  - reuses the countdown logic from `AccountOffboardingPanel.tsx` (extract `useCountdown` / `CountdownLabel` into that file's export, or duplicate the small helper) and the same status labels/colours.
  - refreshes on open; ticks each minute while open.
  - props: `onSelectModel(modelId: string)`.
- `src/components/ModelDashboardTab.tsx`: render the button in the header row (line ~1930 group) and pass a handler that does `setSelectedModelId(id)` plus the existing `detailRef.current?.scrollIntoView` timeout.
- Read-only, admin-only data — existing RLS on `account_offboardings` already restricts it to admins; no migration needed.
