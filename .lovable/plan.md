## Add `campaign` boolean to accounts

### Database
- Migration: `ALTER TABLE public.accounts ADD COLUMN campaign boolean NOT NULL DEFAULT false;`

### Edge functions
- `update-account/index.ts`: add `"campaign"` to the `ALLOWED` set so admins can toggle it via the update endpoint.
- `accounts-with-chatters/index.ts`: add `"campaign"` to the `ACCOUNT_COLS` select list so it's returned in the export.

### Admin UI
- **Add-account form** (in `AdminDashboard.tsx` account creation flow): add a Checkbox labeled "Campaign" that writes `campaign` on insert (defaults to false).
- **Messaging behavior / Setup tab** (per-account messaging settings panel, same area where `post` / `message` / `main_message` / `follow_message` / `media` are toggled): add a Checkbox for `campaign` wired to the same update path used by the other booleans.

### Out of scope
- No chatter-facing UI changes.
- No RLS changes (existing account policies already cover this column).
- Types file regenerates automatically after the migration.
