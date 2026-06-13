## Goal

Move the chatter daily goal from the `daily_goals` table to a new `profiles.daily_goal` column (default `0`), redirect every dependent surface, make the Reports "Goal" column inline‑editable, and base the chatter streak on each chatter's own goal. Document the before/after in a memory file so the change is reversible.

## Dependents of `daily_goals` today

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/DailyGoal.tsx` | Chatter dashboard widget — reads latest `target_amount` |
| 2 | `src/pages/AdminDashboard.tsx` (~3498, 3963–3981) | Deletes goal on chatter delete; "Set Goal" dialog reads + upserts |
| 3 | `src/components/admin/ChatterReportsTab.tsx` (125–131) | Loads goals for the Goal column |
| 4 | `supabase/functions/generate-chatter-summary/index.ts` (117–124) | AI coach uses goal in the prompt (fallback `30`) |

Streak components (`StreakTracker.tsx`, `MonthlyStreakTracker.tsx`) currently use hard‑coded `DAILY_TARGET` — they don't read `daily_goals` yet, but will after this change.

## Plan

### 1. Memory file (before this migration)

Create `mem://features/daily-goal-migration` capturing the **before / after** so we can revert:

- **Before:** `daily_goals(id, user_id, target_amount, created_at, …)` table; latest row per user wins; `DailyGoal` defaulted to `30`; admin dialog inserted a new row each save; AI prompt fell back to `30`; streak used hard‑coded thresholds (`30` chatter, `100` monthly).
- **After:** `profiles.daily_goal numeric NOT NULL DEFAULT 0`; single source of truth per user; admin updates the column directly; AI and streak read the column; goal `0` means "no goal set" (no streak progress).
- **Revert recipe:** re‑create `daily_goals` from the migration referenced below, backfill from `profiles.daily_goal`, restore the four files from git, drop `profiles.daily_goal`.
- Add a link to it in `mem://index.md`.

### 2. Schema migration

```sql
ALTER TABLE public.profiles
  ADD COLUMN daily_goal numeric NOT NULL DEFAULT 0;

UPDATE public.profiles p
   SET daily_goal = g.target_amount
  FROM (
    SELECT DISTINCT ON (user_id) user_id, target_amount
      FROM public.daily_goals
     ORDER BY user_id, created_at DESC
  ) g
 WHERE p.user_id = g.user_id
   AND g.target_amount IS NOT NULL;

DROP TABLE public.daily_goals CASCADE;
```

No new RLS — existing `profiles` policies already cover read (own row / admins) and admin updates. Types regen automatically.

### 3. Code redirects

- **`DailyGoal.tsx`** — query `profiles.daily_goal` for `auth.uid()`; render `0€` when unset (no `30€` fallback).
- **`AdminDashboard.tsx`**
  - Remove the `daily_goals` delete on chatter delete.
  - "Set Goal" dialog: read `profiles.daily_goal`, save via `update({ daily_goal: n }).eq("user_id", uid)`.
- **`ChatterReportsTab.tsx`**
  - Add `daily_goal` to the existing `profiles` select (drop the separate `daily_goals` fetch and `goalMap`).
  - Make the Goal cell **click‑to‑edit**: click reveals a small inline `<input type="number" min="0">`; Enter / blur saves with `profiles.update({ daily_goal })` (key by `user_id`, fallback to `profiles.id` for pre‑create); Esc cancels; optimistic local update + toast.
  - CSV export keeps the same `goal` column.
- **`generate-chatter-summary/index.ts`** — read `daily_goal` from the already‑fetched profile; if `0`, change the prompt section to "TAGESZIEL: kein Ziel gesetzt" and skip the goal‑reached counters; otherwise behave as today.

### 4. Streak based on the per‑chatter goal

- `StreakTracker.tsx`: fetch `profiles.daily_goal` once; a day counts only when `dailyRevenue >= goal && goal > 0`. If `goal === 0`, show "Set a daily goal to start a streak" and don't award days. Existing `getConsecutiveDays` already resets to `0` on a missed day — keep it. Replace `DAILY_TARGET` in copy with the live goal.
- `MonthlyStreakTracker.tsx`: same swap (hard‑coded `100` → live `daily_goal`).
- `STREAK_GOAL = 7` (run length) stays.

### 5. Out of scope

No changes to revenue tables, account assignments, platform tabs, or other admin tabs. No new edge functions.

## Technical notes

- After the migration, `types.ts` drops `daily_goals` and gains `profiles.daily_goal` — all four files compile against the new types in the same change.
- Inline edit reuses table styling — no new dialog or component.
- The memory file is written **before** the migration call so the revert recipe exists even if something fails mid‑migration.
