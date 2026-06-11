## Goal

Two changes to `reassignAccount` (and its sibling `removeAccount`) in `src/pages/AdminDashboard.tsx`:

1. Replace the full `loadChatters()` refetch with an in-place state patch so the row updates instantly after a successful backend call.
2. Add `pre_create` profile support — assign via `account_assignments.profile_id` when the chatter has no `user_id`.

No UI redesign — same dialog, same buttons; the change is in the post-success state plumbing and the assignment SQL path.

---

## What `loadChatters()` currently refreshes after a reassign

- `chatters`: each row's `assigned_accounts` array (derived from `accounts.assigned_to` + open `account_assignments`)
- `accounts`: `assigned_to` / `assigned_at` on the affected row
- `pwaUsers`, `modelNames`: untouched by an assignment, no refresh needed
- `chatterRealStats` / `loginStats` / `assignments` tab data: not refreshed by `loadChatters` (separate loaders)

So a targeted patch only needs to mutate `chatters` and `accounts`.

---

## Frontend changes (`src/pages/AdminDashboard.tsx`)

### `reassignAccount(newAccountId)`

Branch by `reassignTarget.user_id`:

**Real user (existing path, refactored):**
- `UPDATE accounts SET assigned_to=user_id, assigned_at=now() WHERE id=newAccountId` (trigger opens `account_assignments` row).
- Mirror credentials to `profiles` (unchanged).
- Drive share + push + 24h follow-up (unchanged).

**Pre-create profile (new path, when `!user_id`):**
- Look up the account's previous open assignment(s) and close them: `UPDATE account_assignments SET end_date=current_date, unassigned_at=now() WHERE account_id=newAccountId AND end_date IS NULL`. Also clear `accounts.assigned_to` if it points to the previous user so the row is visibly free for them.
- `INSERT INTO account_assignments (account_id, profile_id, start_date, assigned_at) VALUES (newAccountId, profile.id, current_date, now())`.
- Skip credentials mirror, Drive share, push, and follow-up scheduling (all require `user_id` / login email). Show a small info toast: "Pre-Create — Account vorgemerkt, Push/Drive folgen nach Anmeldung."

### Optimistic state patch (replaces `loadChatters()` on success)

After the backend call resolves, patch state locally:

1. **`accounts`**: replace the affected row with `{ ...acc, assigned_to: user_id ?? null, assigned_at: new Date().toISOString() }` (pre-create keeps `assigned_to` null since the assignment lives on `account_assignments`).
2. **`chatters`**:
   - Remove the account from any other chatter's `assigned_accounts` (handles reassignment from one chatter to another within the same session).
   - Add the updated account object to `reassignTarget`'s `assigned_accounts` (dedupe by id).
   - For the real-user branch, also update `account_email` / `account_password` / `account_domain` on the row to match the mirrored profile fields.

Close the dialog (`setReassignTarget(null)`) only after the state patch.

### `removeAccount(accountId?)`

Same treatment — after the backend update succeeds:
- Real user: clear `accounts.assigned_to` for the targeted account(s); patch local `accounts` and remove the account(s) from the chatter's `assigned_accounts`. Update mirrored credentials on the local row to match the remaining account (or null).
- Pre-create: close the open `account_assignments` row by `account_id + profile_id`; patch local state the same way.

Drop the trailing `loadChatters()` call.

### Type touch-up

`ChatterProfile.user_id` is already typed as `string` but loaded as `""` for pre-create. The new branches read `reassignTarget.user_id` truthy/falsy, so no type change needed. `ChatterLite` (popover-side `AssignAccountToChatterButton`) is out of scope for this change.

---

## Edge cases

- Reassigning an account that's already on the same chatter → backend update is a no-op, local state stays consistent (dedupe by id).
- Pre-create chatter that already has the account assigned via `profile_id` → skip the insert if an open row exists.
- Backend failure at any step → keep existing behavior: toast the error, leave the dialog open, do NOT patch state.
- Concurrent admins: optimistic patch may briefly diverge from reality; the next natural `loadChatters()` (filter change, tab switch, manual refresh) reconciles. Acceptable trade-off for the speed win.

---

## Out of scope

- Popover-side `AssignAccountToChatterButton` (separate flow, separate ticket).
- Multi-account profile credential strategy (still overwrites with the latest assigned account; flagged earlier, not changing here).
