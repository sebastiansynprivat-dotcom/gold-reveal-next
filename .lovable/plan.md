## Goal
Persist the Posting Behavior and Mass DM Behavior toggle + textarea state on each account by adding 4 new columns to the `accounts` table, then wire the existing UI in `AdminDashboard.tsx` to read/write them.

## Step 1 — Database migration

Add 4 columns to `public.accounts`:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `post` | `boolean` | `false` | Posting Behavior ON/OFF toggle |
| `message` | `boolean` | `false` | Mass DM Behavior ON/OFF toggle |
| `main_message` | `text` | `''` | Main Message textarea |
| `follow_message` | `text` | `''` | Follow-up Message textarea |

Note: column names use snake_case (`main_message`, `follow_message`) since Postgres identifiers shouldn't contain hyphens. `post` and `message` stay as requested.

No new RLS/grants needed — existing policies on `accounts` already cover these columns.

## Step 2 — Wire UI in `src/pages/AdminDashboard.tsx`

In the Posting Behavior section:
- Bind the toggle to `acc.post`, persist via existing account update flow.
- (Existing textareas in Posting Behavior already exist — confirm whether they should also map to a column. Currently this plan keeps Posting Behavior untouched aside from the toggle. **Open question below.**)

In the new Mass DM Behavior section (currently disabled placeholders):
- Bind the ON toggle to `acc.message`.
- Bind Main Message textarea to `acc.main_message`.
- Bind Follow Up textarea to `acc.follow_message`.
- Enable the controls (they are currently `disabled`).
- Save on blur / via the existing per-account save pattern used by other fields in the same row.

The 7-day stats table stays as placeholder for now (not part of this task).

## Open questions
1. Should `post` and the Posting Behavior textareas be wired too, or only the toggle for now? (You said "post → bool" so the toggle yes, but Posting Behavior already has textareas — should those map to existing/new columns or stay as-is?)
2. Confirm snake_case column names `main_message` / `follow_message` are fine (vs. the hyphenated names from the request, which Postgres doesn't allow without quoting).
