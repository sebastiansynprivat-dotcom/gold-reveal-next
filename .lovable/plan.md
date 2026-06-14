## Goal

Compute all revenue + activity stats in the admin Reports tab from `profiles_data` (keyed by `telegram_id` + `date`), while still grouping chatters into platform buckets based on their **current assignments**. Pre-created chatters (no `user_id`, only `profile_id`) are first-class — their assignments are looked up by `profile_id`.

## File

`src/components/admin/ChatterReportsTab.tsx`

## Data-loading rewrite

1. **Eligible chatters = anyone with a `telegram_id`**
   - Skip only chatters with no `telegram_id` at all (nothing to key `profiles_data` on).
   - Collect both:
     - `userIds` = chatter `user_id`s (non-null) — for assignments + profiles lookup.
     - `profileIds` = chatter `id`s (the `profiles.id`) — for **pre_create** chatters' assignments.

2. **Platform buckets — assignments, grouping only**
   - Two fetches against `account_assignments` where `end_date IS NULL`:
     - `.in("user_id", userIds)` for normal chatters.
     - `.in("profile_id", profileIds)` for pre_create chatters.
   - Merge results, then map each assignment back to the owning chatter using **either** `user_id` **or** `profile_id` (whichever matched).
   - Fetch `accounts` (id → platform, model_id) for the union of account_ids.
   - Fetch `models` (id → name) for involved model_ids — keeps the "Models" column populated.
   - Build `platformsByChatter` and `modelsByChatter`, both keyed by `chatter.id` (works for users + pre_create alike).
   - **Fallback bucket**: chatters with no current assignment of either kind appear under an "Unassigned" platform tab so they don't disappear from the report.

3. **Stats source — `profiles_data`**
   - Single paginated fetch (PAGE=1000, batches of 50 telegram_ids), keyed by the raw `telegram_id` from each chatter record:
     ```
     supabase.from("profiles_data")
       .select("telegram_id,date,revenue,mass_dm,unread_chats,oldest_chat")
       .in("telegram_id", batch)
       .lte("date", selISO)
       .order("date", { ascending: false })
       .range(from, from + PAGE - 1)
     ```
   - Group rows into `dataByTelegram: Map<telegram_id, Row[]>`.

4. **Per-chatter aggregation (platform-independent)**
   - `totalByDate` = sum of `revenue` per date.
   - `all_time` = sum across all dates ≤ selected date.
   - `day` / `week` (last completed Mon–Sun) / `prev_week` / `month` (last completed calendar month) / `prev_month` — sum `totalByDate` over the same window definitions already in the file.
   - `weekly` (5 buckets) and `monthly` (5 buckets) sparklines — same windows as today.
   - `daily` (last 10 days) — from `totalByDate`.
   - Activity from the **latest** `profiles_data` row ≤ selected date: `mass_dms` ← `r.mass_dm`, `unread` ← `r.unread_chats`, `oldest` ← `r.oldest_chat`.
   - `streak` — driven by `totalByDate` vs `daily_goal`.

5. **Emit rows per platform bucket (same totals duplicated)**
   - For each platform in `platformsByChatter.get(chatter.id)`: emit a Row with that platform label, `models = Array.from(modelsByChatter.get(chatter.id))`, and the per-chatter totals/activity computed above.
   - If no current assignments: emit one row under the "Unassigned" bucket.
   - `key = ${chatter.id}__${platform}`.

## Goals & start dates

- `profiles` fetch widened to include both `userIds` and `profileIds`: `.or("user_id.in.(...),id.in.(...)")` — covers pre_create rows (which have an `id` but no `user_id`).
- `goalMap` / `startMap` keyed by `chatter.id` (resolved per chatter).
- Pre_create chatters with goal=0 simply render `streak=0` — same as today.

## Things removed

- `accounts_data` fetch, `inWindow(...)` assignment-bounded filter, `latestByAccount` logic.
- Assignment `start_date`/`end_date` no longer used for math (only "is there a current bucket?").

## Things unchanged

- UI: table columns, platform tabs (with new "Unassigned" tab when needed), sparklines, dialog, XLSX export, goal cell, streak rendering, search.
- Telegram-id display in the row.
- Dev-mode invariant guard (now compares week/month vs chatter-wide all_time).

## Edge cases

- Query `profiles_data` with the raw `telegram_id` we have on the chatter record (matches what `ingest-profiles-data` writes). If lookups come back empty in dev, add a normalized fallback (`lower(strip_leading_@)`).
- `revenue` numeric → `Number(r.revenue || 0)`.
- DB column is `mass_dm` (singular); Row field stays `mass_dms`.
