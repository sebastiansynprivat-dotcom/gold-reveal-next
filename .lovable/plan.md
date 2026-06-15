## Goal
In the Model-Dashboard → Plattform-Accounts section, continue to display platform accounts that have been deleted (archived). Render them in the same grouped/accordion list but visually grayed out and with all action buttons (edit, delete, copy) disabled. New accounts can still be added; the archived rows are read-only ghosts.

## Scope
File: `src/components/ModelDashboardTab.tsx` only. UI/presentation change. No backend/schema changes. Revenue logic that already reads `deleted_records` stays untouched.

## Approach

1. **Extend the row type** with an optional `archived?: boolean` flag on `AccountRow` (purely client-side).

2. **Load archived accounts** inside `loadModelAccounts(modelId)`:
   - Query `deleted_records` where `entity_type = 'account'` and `data->>model_id = modelId` (or filter client-side after fetching by model_id snapshot — same approach already used for revenue at line ~789).
   - Map each archived record into an `AccountRow`-shaped object using `data` (id from `original_id`, email/domain/password/platform/assigned_to from snapshot) and set `archived: true`.
   - Merge with the live accounts array (live first, archived appended per platform) and pass to `setModelAccounts`.
   - Include archived `assigned_to` ids in the chatter-profile fetch so the "Zugewiesener Chatter" line still resolves a name.

3. **Render treatment** in the accordion item (~lines 3362–3528):
   - Wrap each account card with conditional classes when `acc.archived`:
     - Container: add `opacity-50 grayscale pointer-events-none-on-actions` — keep the card readable but muted (e.g. `opacity-60`, `border-dashed`, `bg-secondary/10`).
     - Add a small "Archiviert" badge at the top of the card (muted pill).
   - Disable / hide controls when archived:
     - Edit button: `disabled` and not clickable (don't open edit mode).
     - Delete button: `disabled`.
     - Copy-to-clipboard buttons (email + password): hidden or disabled.
     - Never enter inline edit mode for archived rows (guard `startEditAccount`).
   - Keep all text (email, domain, PW, ID, assigned chatter) visible so admins can still reference what was there.

4. **Accordion header count**: keep counting both live + archived in the per-platform count, OR display as `"3 Accounts (1 archiviert)"`. Use the latter for clarity.

5. **Add-account button** at the bottom: keep current logic (`modelAccounts.length < PLATFORMS.length`) but compute against live accounts only so archived rows don't block adding new ones.

## Out of scope
- No restore-archived action (not requested).
- No changes to the deletion flow itself — archived rows already land in `deleted_records`.
- No changes to other admin pages.
