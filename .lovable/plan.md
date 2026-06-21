## Goal
Add a `username` field to the `accounts` table, require it during account creation, and make it editable in the per-platform account section of the Model dashboard (Admin → Models → "Plattform-Accounts").

## 1. Database migration
- `ALTER TABLE public.accounts ADD COLUMN username text;`
- No NOT NULL constraint (existing rows would break). Required-ness is enforced in the UI.
- Allow the `update-account` edge function to accept the new field by adding `"username"` to its `ALLOWED` set.

## 2. Account creation paths (require username)
All flows live in `src/components/ModelDashboardTab.tsx`:

- **Create new Model wizard** (`createAccounts` state, ~line 437) — add `username: ""` to the per-platform draft shape; render a "Username" input next to email/password (~line 4263); when submitting at ~line 1284, include `username` and reject submit if any selected platform has empty username (toast: "Username fehlt für <platform>").
- **Add accounts to existing Model** (similar block at ~line 4410 / insert at ~line 1436) — same input + required validation + include in insert payload.
- **Edit existing account dialog** (`editAccountData` ~line 494, input ~line 3511, update at ~line 1499) — add Username input, require non-empty, include in update payload.

## 3. Display
- Show username under the account row in the admin Plattform-Accounts table (~line 3568, next to `account_email`).
- Read-only display in the model-facing `ModelHomeDashboard.tsx` accounts list (~line 967/995) — include in the select at line 300, render under the email with a copy button matching the existing pattern. (Models view-only here; editing stays admin-side as today.)

## 4. Types
Regenerated automatically after migration approval — no manual edit to `src/integrations/supabase/types.ts`.

## Out of scope
- No backfill of existing rows (username stays NULL until edited).
- No change to ingest/edge functions besides `update-account` allowlist.

## Open question
"Platform-Accounts section of the model-dashboard" — I'm reading this as the **Admin** Model tab (where accounts are created/edited per platform). The model-facing dashboard only displays accounts read-only; I'll add `username` to that display too but not make it editable there. Confirm if you actually want models to edit their own usernames.