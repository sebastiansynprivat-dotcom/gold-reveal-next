## Update `accounts-with-chatters` to include pre-create chatters

Currently the edge function only resolves assigned chatters via `account_assignments.user_id` → `profiles.user_id`. Pre-create profiles have no `user_id`, so their assignments are silently dropped from the export.

### Changes to `supabase/functions/accounts-with-chatters/index.ts`

1. **Expand assignment query** — select `account_id, user_id, profile_id` (currently only `user_id`).
2. **Track both keys per account** — instead of a `Set<string>` of user_ids per account, store a `Set` of identifiers that can be either `user_id` or `profile_id` (tag them, e.g. `u:<uuid>` / `p:<uuid>`), so an open assignment with only `profile_id` is still captured.
3. **Fetch profiles by both columns** — collect all `user_id`s and all `profile_id`s referenced, then run two queries:
   - `profiles.select(...).in('user_id', [...])` (existing)
   - `profiles.select(...).in('id', [...])` for pre-create profiles
   Merge into a lookup keyed by the same tag used above.
4. **Build `assigned_chatter`** — map each tagged id through the merged lookup; keep the existing shape (`user_id`, `telegram_id`, `language`, `offer`). For pre-create rows, `user_id` will be `null` (since the profile has none) — include the profile so downstream consumers see the chatter.
5. **Keep `accounts.assigned_to` handling unchanged** (that column is always a real `user_id`).

No DB migration, no other files touched.
