## Wire Posting + Mass DM Behavior to `accounts`

### Step 1 — Migration
Add to `public.accounts`:
- `media_id` — `text`, default `''`

(`post`, `message`, `main_message`, `follow_message` already added.)

### Step 2 — UI wiring in `src/pages/AdminDashboard.tsx`

Helper `updateAccountField(accId, patch)`:
- Optimistic `setAccounts` update
- `supabase.from("accounts").update(patch).eq("id", accId)`
- On success: `toast.success("Saved")`
- On error: `toast.error("Failed to save")` + reload accounts

**Status pills removed** from both Posting and Mass DM cards. All status feedback now flows through the existing toast system.

**Posting Behavior card**:
- Switch → controlled by `acc.post`, `onCheckedChange` → `updateAccountField(acc.id, { post: v })`.
- "ON"/"OFF" label reflects `acc.post`.
- Other elements stay placeholder.

**Mass DM Behavior card**:
- ON Switch → bound to `acc.message`, persists immediately on toggle.
- Main Message `<Textarea>`: local draft state (`mainDraft`), no autosave. Enabled.
  - Green **"Set"** button is the only way to persist → `updateAccountField(acc.id, { main_message: mainDraft })`. Visual "dirty" state when draft ≠ saved value.
- Follow Up `<Textarea>` + green **"Set"** button: same pattern with `follow_message` / `followDraft`.
- Textareas re-sync from `acc.main_message` / `acc.follow_message` when the account row changes.

**Media row**:
- "No Media Set" becomes an `<Input>` controlled by `mediaDraft`, initialized from `acc.media_id`. Enabled.
- **"Set Media" button**:
  - Label = `acc.media_id ? "Refresh Media" : "Set Media"`.
  - Stays **disabled** for now (logic not yet hooked) — per user, the button itself isn't wired yet.
- "Reset Media" stays as a disabled placeholder.
- 7-day grid stays as visual placeholder.

### Type
`AccountEntry` gets optional `post`, `message`, `main_message`, `follow_message`, `media_id` if strictly typed.

No RLS changes — existing `accounts` policies cover these columns.
