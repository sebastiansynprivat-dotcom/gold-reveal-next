# Setup table: fix Bot DM / Welcome behaviour

The two columns are currently swapped in meaning. Reassign them so Bot DM reflects the real bot state per account, and Welcome becomes the manual per-account checkmark.

## New behaviour

**Bot DM** (indicator only, not clickable, per account)
- Empty: no main message set on the account.
- Yellow/gold: main message is set (media and follow-up are optional).
- Green: the account's message switch is ON.

**Welcome** (manual, clickable, per account)
- Simple on/off flag the admin sets by hand, stored per account (not per model).

**Feed Post** (indicator only, not clickable)
- Stays green when the account's posting switch is on, but the checkmark itself no longer toggles it. The switch inside the expanded row remains the way to change it.

**Account Setup, Feed Folder** — unchanged.

## Guard on the message switch

The message switch in the expanded row can only be turned on when a main message is saved. Without one it is disabled with a short hint, so a bot can never be activated without a message.

## Filters

- "Bot DM-Setup" filter lists accounts that are not green (bot not active).
- "Welcome-Nachricht" filter uses the new manual per-account flag.

## Technical notes

- Migration: add `welcome_done boolean not null default false` to `public.accounts`. No new grants needed (accounts already exposed); existing RLS applies.
- `src/pages/AdminDashboard.tsx`:
  - `computeStates`: `botdmState` = `'none' | 'partial' | 'done'` derived from `acc.main_message` and `acc.message`; `welcomeDone` = `acc.welcome_done`; drop the model-level `*_massdm_done` / `*_botdm_done` reads for these two columns.
  - `CellCheck` gains a `tone` prop (`gold` = partial, `emerald` = done) and renders non-interactive when no `onToggle` is passed.
  - Bot DM and Feed Post cells render without `onToggle`; Welcome cell calls `updateAccountField(acc.id, { welcome_done: !acc.welcome_done })`.
  - Add `welcome_done` to the `AccountEntry` interface and to the accounts select list.
  - Disable the message `Switch` when `!acc.main_message?.trim()`.
  - Update the two status filters accordingly.
